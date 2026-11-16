import { decideSheetListDrag } from '@tripflix/app-core';
import { GestureStateManager, useNativeGesture, usePanGesture } from 'react-native-gesture-handler';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

type PanConfig = NonNullable<Parameters<typeof usePanGesture>[0]>;

/**
 * Vuốt xuống trong danh sách của sheet để kéo sheet. Danh sách đang cuộn dở thì cuộn lên trước, chạm đỉnh
 * thì cùng ngón tay đó kéo sheet xuống luôn, giống sheet của iOS, không phải nhấc tay vuốt lại.
 * Gắn `pan` ở ngoài, `scroll` ở trong, quanh ScrollView có `onScroll` và `bounces={false}`.
 * Các callback truyền vào phải là worklet.
 */
export function useSheetListDrag({
  enabled,
  activateAfter,
  onActivate,
  onUpdate,
  onDeactivate,
}: Pick<PanConfig, 'enabled' | 'onActivate' | 'onUpdate' | 'onDeactivate'> & {
  /** Quãng kéo xuống (pt) tính từ lúc danh sách chạm đỉnh thì bắt đầu kéo sheet. */
  activateAfter: number;
}) {
  const scrollY = useSharedValue(0);
  const startX = useSharedValue(0);
  // Điểm tính quãng kéo. Còn cuộn được thì dời theo ngón tay, nên quãng kéo sheet tính từ lúc chạm đỉnh.
  const anchorY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const scroll = useNativeGesture();
  const pan = usePanGesture({
    enabled,
    manualActivation: true,
    simultaneousWith: scroll,
    onTouchesDown: (event) => {
      const touch = event.allTouches[0];
      isDragging.set(false);
      if (!touch || event.numberOfTouches !== 1) {
        GestureStateManager.fail(event.handlerTag);
        return;
      }
      startX.set(touch.absoluteX);
      anchorY.set(touch.absoluteY);
    },
    onTouchesMove: (event) => {
      const touch = event.allTouches[0];
      // Đang kéo sheet thì để pan tự theo ngón tay, kể cả khi ngón tay lệch ngang hay đi ngược lên.
      if (!touch || isDragging.get()) return;
      const decision = decideSheetListDrag({
        scrollY: scrollY.get(),
        anchorY: anchorY.get(),
        touchY: touch.absoluteY,
        horizontalTravel: Math.abs(touch.absoluteX - startX.get()),
        touchCount: event.numberOfTouches,
        activateAfter,
      });
      anchorY.set(decision.anchorY);
      if (decision.step === 'fail') GestureStateManager.fail(event.handlerTag);
      else if (decision.step === 'activate') GestureStateManager.activate(event.handlerTag);
    },
    onActivate: (event) => {
      isDragging.set(true);
      onActivate?.(event);
    },
    onUpdate,
    onDeactivate: (event) => {
      isDragging.set(false);
      onDeactivate?.(event);
    },
  });
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  return { pan, scroll, onScroll, scrollY };
}
