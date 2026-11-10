import { useState } from 'react';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFrame } from './app-frame';
import { Icon, Row, Txt } from './mobile-ui';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_SHOWN = 12;
const pad = (value: number) => String(value).padStart(2, '0');
const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parse = (iso: string) => new Date(`${iso}T00:00:00`);
export const formatDisplayDate = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');
const formatShort = (iso: string) => {
  const date = parse(iso);
  return `${WEEKDAY_SHORT[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
};
const nightsBetween = (from: string, to: string) =>
  Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
const firstOfMonth = (iso: string) => {
  const date = parse(iso);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

type SheetProps = {
  isOpen: boolean;
  title: string;
  min?: string;
  max?: string;
  onClose: () => void;
} & (
  | {
      mode: 'range';
      start: string;
      end: string;
      onDone: (range: { start: string; end: string }) => void;
      startLabel: string;
      endLabel: string;
    }
  | { mode: 'single'; value: string; onDone: (value: string) => void }
);

/** Lưới một tháng; khoảng ngày là một dải liền, bo tròn hai đầu như Airbnb. */
function MonthGrid({
  month,
  min,
  max,
  start,
  end,
  pageHeight,
  onPick,
}: {
  pageHeight: number;
  month: Date;
  min?: string;
  max?: string;
  start: string;
  end: string;
  onPick: (iso: string) => void;
}) {
  const offset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // Mặc định 5 hàng, tháng nào cần thì 6; ô ngoài tháng lấy ngày tháng trước/sau, chữ nhạt.
  const rows = Math.max(5, Math.ceil((offset + daysInMonth) / 7));
  const cells = Array.from({ length: rows * 7 }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1);
    return { iso: toIso(date), isInMonth: date.getMonth() === month.getMonth() };
  });
  const hasRange = !!start && !!end;
  // Ô ngày co theo vùng lịch để luôn thấy đủ 5–6 hàng; 56 là tiêu đề tháng và khoảng đệm.
  const cellHeight = pageHeight ? Math.max(32, Math.min(46, Math.floor((pageHeight - 56) / rows))) : 46;
  const dotSize = Math.min(40, cellHeight - 4);
  return (
    <View style={{ gap: spacing.sm }}>
      <Txt variant="label" style={{ fontSize: 17, paddingHorizontal: spacing.xs }}>
        Tháng {month.getMonth() + 1}, {month.getFullYear()}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map(({ iso, isInMonth }, index) => {
          if (!isInMonth)
            return (
              <View
                key={`out-${iso}`}
                style={{ width: `${100 / 7}%`, height: cellHeight, justifyContent: 'center' }}
              >
                <Txt
                  style={{ textAlign: 'center', color: colors.coralSoft, opacity: 0.5, fontWeight: '500' }}
                >
                  {parse(iso).getDate()}
                </Txt>
              </View>
            );
          const isDisabled = (!!min && iso < min) || (!!max && iso > max);
          const isStart = iso === start;
          const isEnd = iso === end;
          const selected = isStart || isEnd;
          const inside = hasRange && iso > start && iso < end;
          const column = index % 7;
          // Dải nền: nửa phải ở ngày nhận, nửa trái ở ngày trả, đủ ô ở giữa; bo tròn ở đầu/cuối hàng.
          const hasBand = hasRange && start !== end && (inside || isStart || isEnd);
          const roundLeft = inside && column === 0;
          const roundRight = inside && column === 6;
          const textColor = selected ? colors.background : inside ? colors.tealInk : colors.ink;
          return (
            <View key={iso} style={{ width: `${100 / 7}%`, height: cellHeight, justifyContent: 'center' }}>
              {hasBand && (
                <View
                  style={{
                    position: 'absolute',
                    top: 3,
                    bottom: 3,
                    left: isStart ? '50%' : 0,
                    right: isEnd ? '50%' : 0,
                    backgroundColor: colors.seaMist,
                    borderTopLeftRadius: roundLeft ? radius.pill : 0,
                    borderBottomLeftRadius: roundLeft ? radius.pill : 0,
                    borderTopRightRadius: roundRight ? radius.pill : 0,
                    borderBottomRightRadius: roundRight ? radius.pill : 0,
                  }}
                />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={formatDisplayDate(iso)}
                accessibilityState={{ selected, disabled: isDisabled }}
                disabled={isDisabled}
                onPress={() => onPick(iso)}
                style={({ pressed }) => ({
                  alignSelf: 'center',
                  width: dotSize,
                  height: dotSize,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? colors.tealInk : pressed ? colors.surfaceMuted : 'transparent',
                })}
              >
                <Txt
                  style={{
                    fontWeight: selected ? '700' : '500',
                    color: isDisabled ? colors.textSubtle : textColor,
                    opacity: isDisabled ? 0.55 : 1,
                  }}
                >
                  {parse(iso).getDate()}
                </Txt>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Bảng chọn năm rồi tháng, để nhảy nhanh tới ngày xa (ngày sinh, chuyến năm sau). */
function YearMonthPicker({
  current,
  min,
  max,
  onPick,
}: {
  current: Date;
  min?: string;
  max?: string;
  onPick: (month: Date) => void;
}) {
  const [year, setYear] = useState<number | null>(null);
  const minYear = min ? parse(min).getFullYear() : current.getFullYear() - 100;
  const maxYear = max ? parse(max).getFullYear() : current.getFullYear() + 5;
  if (year === null) {
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {years.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            onPress={() => setYear(item)}
            style={{
              width: '22%',
              paddingVertical: spacing.sm,
              alignItems: 'center',
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: item === current.getFullYear() ? colors.tealInk : colors.border,
              backgroundColor: item === current.getFullYear() ? colors.seaMist : colors.background,
            }}
          >
            <Txt variant="label">{item}</Txt>
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      <Txt variant="heading">Năm {year}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {Array.from({ length: 12 }, (_, index) => {
          const monthStart = `${year}-${pad(index + 1)}-01`;
          const monthEnd = toIso(new Date(year, index + 1, 0));
          const isDisabled = (!!min && monthEnd < min) || (!!max && monthStart > max);
          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              disabled={isDisabled}
              onPress={() => onPick(new Date(year, index, 1))}
              style={{
                width: '30%',
                paddingVertical: spacing.md,
                alignItems: 'center',
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: isDisabled ? 0.4 : 1,
              }}
            >
              <Txt variant="label">Tháng {index + 1}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Kiểu A: bảng lịch toàn màn, chạm ngày nhận rồi ngày trả (hoặc một ngày), có chọn năm/tháng. */
export function DateSheet(props: SheetProps) {
  const initial = props.mode === 'range' ? props.start : props.value;
  const [draftStart, setDraftStart] = useState(props.mode === 'range' ? props.start : props.value);
  const [draftEnd, setDraftEnd] = useState(props.mode === 'range' ? props.end : '');
  const [firstMonth, setFirstMonth] = useState(() => firstOfMonth(initial || props.min || toIso(new Date())));
  const [isPickingYear, setPickingYear] = useState(false);
  const months = Array.from(
    { length: MONTHS_SHOWN },
    (_, index) => new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1),
  );
  const pick = (iso: string) => {
    if (props.mode === 'single') {
      setDraftStart(iso);
      return;
    }
    // Đã có đủ hai ngày, hoặc chạm ngày trước ngày nhận: bắt đầu chọn lại từ ngày nhận.
    if (!draftStart || draftEnd || iso <= draftStart) {
      setDraftStart(iso);
      setDraftEnd('');
      return;
    }
    setDraftEnd(iso);
  };
  const frame = useAppFrame();
  const [pageHeight, setPageHeight] = useState(0);

  const canFinish = props.mode === 'single' ? !!draftStart : !!draftStart && !!draftEnd;
  const finishLabel =
    props.mode === 'range'
      ? draftEnd
        ? `Xong · ${nightsBetween(draftStart, draftEnd)} đêm`
        : 'Chọn ngày trả phòng'
      : draftStart
        ? `Xong · ${formatDisplayDate(draftStart)}`
        : 'Chọn một ngày';
  return (
    <Modal visible={props.isOpen} transparent animationType="slide" onRequestClose={props.onClose}>
      {/* Bảng trượt từ dưới lên, còn thấy trang phía sau; chạm vùng mờ để đóng. */}
      <View style={{ flex: 1, backgroundColor: colors.overlay }}>
        {/* Bảng lịch theo đúng vị trí và bề rộng khung app đo được, không dùng số cố định. */}
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            marginLeft: frame?.x ?? 0,
            width: frame?.width ?? '100%',
          }}
        >
          <Pressable accessibilityLabel="Đóng" onPress={props.onClose} style={{ flex: 1 }} />
          <SafeAreaView
            edges={['bottom']}
            style={{
              height: '85%',
              borderTopLeftRadius: mobileLayout.sheetRadius,
              borderTopRightRadius: mobileLayout.sheetRadius,
              overflow: 'hidden',
              backgroundColor: colors.background,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 5,
                marginTop: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: colors.border,
              }}
            />
            <Row style={{ justifyContent: 'space-between', alignItems: 'center', padding: spacing.md }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={props.onClose}
                style={{ padding: spacing.xs }}
              >
                <Icon name="close" size={24} />
              </Pressable>
              <Txt variant="heading">{props.title}</Txt>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDraftStart('');
                  setDraftEnd('');
                }}
                style={{ padding: spacing.xs }}
              >
                <Txt variant="label" style={{ color: colors.coralInk }}>
                  Xoá
                </Txt>
              </Pressable>
            </Row>
            {props.mode === 'range' && (
              <Row style={{ gap: spacing.sm, paddingHorizontal: spacing.md }}>
                {[
                  { label: props.startLabel, value: draftStart, isActive: !draftStart || !!draftEnd },
                  { label: props.endLabel, value: draftEnd, isActive: !!draftStart && !draftEnd },
                ].map((box) => (
                  <View
                    key={box.label}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: mobileLayout.cardRadius,
                      borderWidth: box.isActive ? 2 : 1,
                      borderColor: box.isActive ? colors.tealInk : colors.border,
                      backgroundColor: box.isActive ? colors.seaMist : colors.surface,
                    }}
                  >
                    <Icon name="calendar-outline" size={18} color={colors.tealInk} />
                    <View>
                      <Txt variant="small" style={{ color: colors.textMuted }}>
                        {box.label}
                      </Txt>
                      <Txt variant="label">{box.value ? formatShort(box.value) : 'Chọn ngày'}</Txt>
                    </View>
                  </View>
                ))}
              </Row>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn năm và tháng"
              onPress={() => setPickingYear((value) => !value)}
              style={{
                flexDirection: 'row',
                alignSelf: 'flex-start',
                alignItems: 'center',
                gap: 4,
                marginHorizontal: spacing.md,
                marginTop: spacing.md,
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radius.pill,
                backgroundColor: colors.seaMist,
              }}
            >
              <Txt variant="label" style={{ color: colors.tealInk }}>
                {isPickingYear ? 'Quay lại lịch' : `Chọn năm · ${firstMonth.getFullYear()}`}
              </Txt>
              <Icon name={isPickingYear ? 'chevron-up' : 'chevron-down'} size={18} color={colors.tealInk} />
            </Pressable>
            <Row
              style={{
                gap: 0,
                paddingHorizontal: spacing.md,
                paddingTop: spacing.md,
                paddingBottom: spacing.sm,
                borderBottomWidth: isPickingYear ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              {!isPickingYear &&
                WEEKDAYS.map((day) => (
                  <Txt
                    key={day}
                    variant="small"
                    style={{
                      width: `${100 / 7}%`,
                      textAlign: 'center',
                      color: colors.textMuted,
                      fontWeight: '600',
                    }}
                  >
                    {day}
                  </Txt>
                ))}
            </Row>
            {/* Mỗi tháng cao đúng bằng vùng lịch và cuộn dừng ở đầu tháng: mỗi lần vuốt sang trọn một tháng. */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              onLayout={(event) => setPageHeight(Math.round(event.nativeEvent.layout.height))}
              pagingEnabled={!isPickingYear && pageHeight > 0}
              contentContainerStyle={
                isPickingYear ? { padding: spacing.md } : { paddingHorizontal: spacing.md }
              }
            >
              {isPickingYear ? (
                <YearMonthPicker
                  current={firstMonth}
                  min={props.min}
                  max={props.max}
                  onPick={(month) => {
                    setFirstMonth(month);
                    setPickingYear(false);
                  }}
                />
              ) : (
                months.map((month) => (
                  <View
                    key={toIso(month)}
                    style={{ height: pageHeight || undefined, paddingTop: spacing.md, overflow: 'hidden' }}
                  >
                    <MonthGrid
                      month={month}
                      min={props.min}
                      max={props.max}
                      start={draftStart}
                      end={draftEnd}
                      pageHeight={pageHeight}
                      onPick={pick}
                    />
                  </View>
                ))
              )}
            </ScrollView>
            <View style={{ padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Pressable
                accessibilityRole="button"
                disabled={!canFinish}
                onPress={() => {
                  if (props.mode === 'range') props.onDone({ start: draftStart, end: draftEnd });
                  else props.onDone(draftStart);
                  props.onClose();
                }}
                style={{
                  height: mobileLayout.buttonHeight,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: canFinish ? colors.coral : colors.border,
                }}
              >
                <Txt variant="label" style={{ color: colors.background }}>
                  {finishLabel}
                </Txt>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

function DateBox({
  label,
  value,
  isActive,
  onPress,
}: {
  label: string;
  value: string;
  isActive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${formatDisplayDate(value)}`}
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: mobileLayout.cardRadius,
        borderWidth: isActive ? 2 : 1,
        borderColor: isActive ? colors.tealInk : colors.border,
        backgroundColor: colors.background,
      }}
    >
      <View style={{ flexShrink: 1 }}>
        <Txt variant="small" style={{ color: colors.textMuted }}>
          {label}
        </Txt>
        <Txt variant="label">{value ? formatShort(value) : 'Chọn ngày'}</Txt>
      </View>
      <Icon name="calendar-outline" size={20} color={colors.tealInk} />
    </Pressable>
  );
}

/** Hai ô ngày nhận/trả; bấm ô nào cũng mở bảng lịch khoảng ngày. */
export function DateRangeField({
  startLabel,
  endLabel,
  start,
  end,
  min,
  onChange,
}: {
  startLabel: string;
  endLabel: string;
  start: string;
  end: string;
  min?: string;
  onChange: (range: { start: string; end: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Row style={{ gap: spacing.sm }}>
        <DateBox label={startLabel} value={start} onPress={() => setIsOpen(true)} />
        <DateBox label={endLabel} value={end} onPress={() => setIsOpen(true)} />
      </Row>
      {isOpen && (
        <DateSheet
          isOpen
          mode="range"
          title="Chọn ngày"
          startLabel={startLabel}
          endLabel={endLabel}
          start={start}
          end={end}
          min={min}
          onDone={onChange}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

/** Một ô ngày (ngày bay, ngày sinh); bấm mở bảng lịch một ngày. */
export function DateSingleField({
  label,
  value,
  min,
  max,
  error,
  isDisabled,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  error?: string;
  isDisabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={{ gap: spacing.xs }}>
      <Row>
        <DateBox
          label={label}
          value={value}
          isActive={!!error}
          onPress={() => {
            if (!isDisabled) setIsOpen(true);
          }}
        />
      </Row>
      {error && (
        <Txt variant="small" style={{ color: colors.danger }}>
          {error}
        </Txt>
      )}
      {isOpen && (
        <DateSheet
          isOpen
          mode="single"
          title={label}
          value={value}
          min={min}
          max={max}
          onDone={onChange}
          onClose={() => setIsOpen(false)}
        />
      )}
    </View>
  );
}
