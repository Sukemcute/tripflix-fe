import { colors, spacing } from '@tripflix/tokens';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const SHIFT_MS = 150;

/**
 * Danh sách sắp lại bằng bấm giữ rồi kéo (TF105): thẻ đang kéo nổi lên và đi theo ngón tay,
 * các thẻ khác dạt lên hoặc xuống để chừa chỗ; thả tay thì thẻ trượt vào chỗ mới rồi mới gọi `onMove(từ, tới)`.
 * Chỉ phần `handle` (đầu thẻ) nhận cử chỉ, để ô nhập liệu trong thẻ vẫn bấm giữ chọn chữ bình thường.
 */
export function DragSortList<T extends { key: string }>({
  items,
  onMove,
  onDragChange,
  renderItem,
}: {
  items: readonly T[];
  onMove: (from: number, to: number) => void;
  /** Báo bên ngoài đang kéo, để khoá cuộn trong lúc kéo. */
  onDragChange?: (isDragging: boolean) => void;
  renderItem: (item: T, index: number, handle: (child: ReactNode) => ReactNode) => ReactNode;
}) {
  // Chiều cao nhớ theo khoá của thẻ, không theo vị trí: sắp lại xong thẻ không đo lại vẫn đúng.
  const heightByKey = useRef(new Map<string, number>());
  const heights = useSharedValue<number[]>([]);
  const active = useSharedValue(-1);
  const target = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const keys = items.map((item) => item.key);
  const order = keys.join('|');
  // Danh sách đã vẽ theo thứ tự mới: lúc này mới thả thẻ về vị trí tự nhiên, không bị giật về chỗ cũ.
  useLayoutEffect(() => {
    heights.set(order.split('|').map((key) => heightByKey.current.get(key) ?? 0));
    active.set(-1);
    target.set(-1);
    dragY.set(0);
  }, [order, heights, active, target, dragY]);
  const finish = (from: number, to: number) => {
    onDragChange?.(false);
    if (from !== to) {
      onMove(from, to);
      return;
    }
    active.set(-1);
    target.set(-1);
    dragY.set(0);
  };
  return (
    <GestureHandlerRootView style={styles.list}>
      {items.map((item, index) => (
        <DragRow
          key={item.key}
          index={index}
          count={items.length}
          heights={heights}
          active={active}
          target={target}
          dragY={dragY}
          onLayoutHeight={(height) => {
            if (heightByKey.current.get(item.key) === height) return;
            heightByKey.current.set(item.key, height);
            heights.set(keys.map((key) => heightByKey.current.get(key) ?? 0));
          }}
          onStart={() => onDragChange?.(true)}
          onFinish={finish}
          render={(handle) => renderItem(item, index, handle)}
        />
      ))}
    </GestureHandlerRootView>
  );
}

function DragRow({
  index,
  count,
  heights,
  active,
  target,
  dragY,
  onLayoutHeight,
  onStart,
  onFinish,
  render,
}: {
  index: number;
  count: number;
  heights: SharedValue<number[]>;
  active: SharedValue<number>;
  target: SharedValue<number>;
  dragY: SharedValue<number>;
  onLayoutHeight: (height: number) => void;
  onStart: () => void;
  onFinish: (from: number, to: number) => void;
  render: (handle: (child: ReactNode) => ReactNode) => ReactNode;
}) {
  const gesture = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      active.set(index);
      target.set(index);
      dragY.set(0);
      runOnJS(onStart)();
    })
    .onUpdate((event) => {
      const list = heights.value;
      let top = 0;
      let total = 0;
      for (let i = 0; i < count; i += 1) {
        if (i < index) top += list[i] ?? 0;
        total += list[i] ?? 0;
      }
      const own = list[index] ?? 0;
      // Không cho kéo ra ngoài danh sách.
      const y = Math.min(Math.max(event.translationY, -top), total - top - own);
      dragY.set(y);
      // Tâm thẻ đang kéo rơi vào thẻ nào thì đó là chỗ mới.
      const center = top + y + own / 2;
      let next = 0;
      let edge = 0;
      for (let i = 0; i < count; i += 1) {
        edge += list[i] ?? 0;
        next = i;
        if (center < edge) break;
      }
      target.set(next);
    })
    .onFinalize(() => {
      if (active.value !== index) return;
      const to = target.value;
      const list = heights.value;
      // Độ lệch từ chỗ cũ tới khe mới, để thẻ trượt vào đúng khe trước khi danh sách đổi thứ tự.
      let offset = 0;
      if (to > index) for (let i = index + 1; i <= to; i += 1) offset += list[i] ?? 0;
      else for (let i = to; i < index; i += 1) offset -= list[i] ?? 0;
      dragY.set(
        withTiming(offset, { duration: SHIFT_MS }, (isDone) => {
          if (isDone) runOnJS(onFinish)(index, to);
        }),
      );
    });
  const style = useAnimatedStyle(() => {
    const from = active.value;
    if (from === index) {
      return {
        zIndex: 10,
        transform: [{ translateY: dragY.value }, { scale: withSpring(1.03, { damping: 18 }) }],
        shadowOpacity: withTiming(0.18),
        opacity: 0.97,
      };
    }
    const shift = from < 0 ? 0 : (heights.value[from] ?? 0);
    const to = target.value;
    const offset =
      from >= 0 && index > from && index <= to
        ? -shift
        : from >= 0 && index < from && index >= to
          ? shift
          : 0;
    return {
      zIndex: 0,
      // Sau khi đổi thứ tự (active về -1) thẻ đã ở đúng chỗ nên về 0 ngay, không trượt ngược.
      transform: [{ translateY: from < 0 ? 0 : withTiming(offset, { duration: SHIFT_MS }) }, { scale: 1 }],
      shadowOpacity: 0,
      opacity: 1,
    };
  });
  return (
    <Animated.View
      onLayout={(event: LayoutChangeEvent) => onLayoutHeight(event.nativeEvent.layout.height)}
      style={[styles.row, style]}
    >
      {render((child) => (
        <GestureDetector gesture={gesture}>{child}</GestureDetector>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Khoảng cách giữa các thẻ nằm trong từng dòng để chiều cao đo được đã gồm cả khoảng cách.
  list: { marginBottom: -spacing.sm },
  row: {
    paddingBottom: spacing.sm,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
});
