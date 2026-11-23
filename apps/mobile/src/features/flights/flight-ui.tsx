import { useFlightCalendar } from '@tripflix/api-client';
import type { FlightSort } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { compactType } from '@/components/mobile-scale';
import { assets, Chip, Icon, Row, Txt, ui, type IconName } from '@/components/mobile-ui';

const copy = vi.flights;
/** Logo chữ của hãng, cùng bộ với trang vé trên web. */
const AIRLINE_LOGOS: Record<string, number> = {
  VN: require('../../../assets/airlines/VN.svg'),
  VJ: require('../../../assets/airlines/VJ.svg'),
  VU: require('../../../assets/airlines/VU.png'),
  QH: require('../../../assets/airlines/QH.svg'),
  BL: require('../../../assets/airlines/BL.svg'),
};
const AIRLINE_NAME_CODES: [RegExp, string][] = [
  [/vietnam airlines/i, 'VN'],
  [/vietjet/i, 'VJ'],
  [/vietravel/i, 'VU'],
  [/bamboo/i, 'QH'],
  [/pacific/i, 'BL'],
];
/** Mã hãng từ BE, thiếu (dữ liệu cũ) thì đoán theo tên hãng như web. */
function resolveAirlineCode(code: string | null, airline: string | null): string | null {
  if (code) return code.toUpperCase();
  return AIRLINE_NAME_CODES.find(([pattern]) => pattern.test(airline ?? ''))?.[1] ?? null;
}
const WEEKDAYS = copy.weekdays.split(' ');
const STRIP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (iso: string, days: number) =>
  new Date(new Date(iso + 'T00:00:00Z').getTime() + days * DAY_MS).toISOString().slice(0, 10);

/** "1,13tr" cho dải ngày: đủ so sánh nhanh, giá đầy đủ nằm ở thẻ chuyến. */
function formatShortPrice(amount: number): string {
  if (amount < 1_000_000) return `${Math.round(amount / 1000)}k`;
  return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}tr`;
}

/** Khung giới thiệu như banner trang vé trên web: ảnh, tiêu đề lớn và Tripi. */
export function FlightHero() {
  return (
    <View style={styles.hero}>
      <Image source={assets.sea} contentFit="cover" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.heroShade]} />
      <View style={styles.heroText}>
        <Txt style={styles.heroTitle}>{copy.heroTitle}</Txt>
        <Txt style={styles.heroIntro}>{copy.heroIntro}</Txt>
      </View>
      <Image source={assets.welcome} contentFit="contain" style={styles.heroMascot} />
    </View>
  );
}

/** Ô sân bay đi/đến: biểu tượng, nhãn nhỏ, mã sân bay to và tên thành phố. */
export function AirportField({
  icon,
  label,
  code,
  name,
  placeholder,
  isDisabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  code?: string;
  name?: string;
  placeholder: string;
  isDisabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [styles.field, pressed && styles.pressed, isDisabled && styles.disabled]}
    >
      <View style={styles.fieldIcon}>
        <Icon name={icon} size={22} color={x.day.link} />
      </View>
      <View style={ui.flex}>
        <Txt style={styles.fieldLabel}>{label}</Txt>
        {code ? (
          <Row style={{ gap: spacing.sm, alignItems: 'baseline' }}>
            <Txt style={styles.fieldCode}>{code}</Txt>
            {!!name && (
              <Txt style={styles.fieldName} numberOfLines={1}>
                {name}
              </Txt>
            )}
          </Row>
        ) : (
          <Txt style={styles.fieldPlaceholder}>{placeholder}</Txt>
        )}
      </View>
      <Icon name="chevron-down" size={18} color={x.day.textSecondary} />
    </Pressable>
  );
}

/** Nút tròn đổi chiều sân bay đi và đến, nằm đè giữa hai ô. */
export function SwapAirportsButton({ isDisabled, onPress }: { isDisabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.swap}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [styles.swap, pressed && styles.pressed, isDisabled && styles.disabled]}
    >
      <Icon name="swap-vertical" size={20} color={x.day.link} />
    </Pressable>
  );
}

/** Ô ngày bay hoặc số khách: biểu tượng, nhãn và giá trị. */
export function InfoField({
  icon,
  label,
  value,
  isDisabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  isDisabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.field, styles.fieldCompact, pressed && styles.pressed]}
    >
      <Icon name={icon} size={20} color={x.day.link} />
      <View style={ui.flex}>
        <Txt style={styles.fieldLabel}>{label}</Txt>
        <Txt style={styles.fieldValue}>{value}</Txt>
      </View>
    </Pressable>
  );
}

/** Dải 7 ngày quanh ngày đang tìm kèm giá thấp nhất mỗi ngày; bấm để đổi ngày. */
export function FlightDateStrip({
  from,
  to,
  date,
  passengers,
  childCount,
  infants,
  minDate,
  onChange,
}: {
  from: string;
  to: string;
  date: string;
  passengers: number;
  childCount?: number;
  infants?: number;
  minDate: string;
  onChange: (date: string) => void;
}) {
  const start = [addDays(date, -3), minDate].sort().at(-1)!;
  const calendar = useFlightCalendar({
    from,
    to,
    start,
    end: addDays(start, STRIP_DAYS - 1),
    passengers,
    ...(childCount ? { children: childCount } : {}),
    ...(infants ? { infants } : {}),
  });
  const prices = new Map(calendar.data?.map((day) => [day.date, day.isAvailable ? day.priceFrom : null]));
  const lowest = Math.min(...[...prices.values()].filter((price): price is number => price != null));
  const days = Array.from({ length: STRIP_DAYS }, (_, index) => addDays(start, index));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {days.map((day) => {
        const price = prices.get(day);
        const isSelected = day === date;
        const weekday = WEEKDAYS[(new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7];
        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(day)}
            style={({ pressed }) => [
              styles.stripDay,
              isSelected && styles.stripDaySelected,
              pressed && styles.pressed,
            ]}
          >
            <Txt style={styles.stripWeekday}>
              {weekday} · {day.slice(8, 10)}/{day.slice(5, 7)}
            </Txt>
            <Txt style={[styles.stripPrice, price === lowest && styles.stripPriceLow]}>
              {calendar.data === undefined ? '…' : price != null ? formatShortPrice(price) : '—'}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const SORT_OPTIONS: readonly [FlightSort, string][] = [
  ['recommended', copy.sortRecommended],
  ['price', copy.sortPrice],
  ['departure', copy.sortDeparture],
  ['duration', copy.sortDuration],
];

export function FlightSortChips({
  value,
  onChange,
}: {
  value: FlightSort;
  onChange: (sort: FlightSort) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sorts}>
      {SORT_OPTIONS.map(([key, label]) => (
        <Chip key={key} selected={value === key} onPress={() => onChange(key)}>
          {label}
        </Chip>
      ))}
    </ScrollView>
  );
}

/** "2 giờ" hoặc "1g 45p". */
export function formatFlightDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? t('flights.duration', { hours, minutes: rest }) : t('flights.durationHours', { hours });
}

/** Phần đầu thẻ chuyến: hãng, số hiệu, giờ đi – đến to và thời gian bay ở giữa. */
export function FlightTimeline({
  airline,
  airlineCode,
  baggage,
  flightNumber,
  cabinName,
  fromAirport,
  toAirport,
  departTime,
  arriveTime,
  durationMinutes,
  tags,
}: {
  airline: string | null;
  airlineCode: string | null;
  /** "Xách tay 10kg", "Ký gửi 23kg" của gói vé đang xem. */
  baggage: string[];
  flightNumber: string | null;
  cabinName: string;
  fromAirport: string;
  toAirport: string;
  departTime: string | null;
  arriveTime: string | null;
  durationMinutes: number | null;
  tags: { label: string; tone: 'coral' | 'teal' }[];
}) {
  const code = resolveAirlineCode(airlineCode, airline);
  const logo = code ? AIRLINE_LOGOS[code] : undefined;
  return (
    <View style={{ gap: spacing.sm }}>
      {tags.length > 0 && (
        <Row style={{ gap: spacing.xs }}>
          {tags.map((tag) => (
            <Txt
              key={tag.label}
              style={[styles.tag, tag.tone === 'coral' ? styles.tagCoral : styles.tagTeal]}
            >
              {tag.label}
            </Txt>
          ))}
        </Row>
      )}
      <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
        {logo ? (
          <Image source={logo} contentFit="contain" contentPosition="left" style={styles.airlineLogo} />
        ) : (
          <View style={styles.airlineBadge}>
            <Icon name="airplane" size={16} color={x.brand.white} />
          </View>
        )}
        <View style={ui.flex}>
          {!logo && (
            <Txt style={styles.airline} numberOfLines={1}>
              {airline ?? flightNumber ?? fromAirport + ' → ' + toAirport}
            </Txt>
          )}
          <Txt style={styles.flightMeta}>{[flightNumber, cabinName].filter(Boolean).join(' · ')}</Txt>
        </View>
      </Row>
      <Row style={{ alignItems: 'center', gap: spacing.sm }}>
        <View>
          <Txt style={styles.time}>{departTime?.slice(0, 5) ?? '--:--'}</Txt>
          <Txt style={styles.airport}>{fromAirport}</Txt>
        </View>
        <View style={[ui.flex, { alignItems: 'center', gap: 2 }]}>
          {durationMinutes != null && (
            <Txt style={styles.flightMeta}>{formatFlightDuration(durationMinutes)}</Txt>
          )}
          <View style={styles.line}>
            <View style={styles.lineDot} />
            <View style={styles.lineRule} />
            <Icon name="airplane" size={14} color={x.action.primary} />
          </View>
          <Txt style={styles.direct}>{copy.direct}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt style={styles.time}>{arriveTime?.slice(0, 5) ?? '--:--'}</Txt>
          <Txt style={styles.airport}>{toAirport}</Txt>
        </View>
      </Row>
      {baggage.length > 0 && (
        <Row style={{ gap: spacing.xs, flexWrap: 'wrap' }}>
          {baggage.map((item) => (
            <Txt key={item} style={styles.baggage}>
              {item}
            </Txt>
          ))}
        </Row>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  hero: {
    minHeight: 220,
    borderRadius: mobileLayout.cardRadius,
    overflow: 'hidden',
    backgroundColor: x.day.tintExplore,
    justifyContent: 'flex-start',
  },
  heroShade: { backgroundColor: x.day.surface, opacity: 0.78 },
  heroText: { gap: spacing.xs, padding: spacing.lg, paddingRight: 110, zIndex: 1 },
  heroTitle: { ...compactType.title, fontFamily: nativeFonts.bold, color: x.day.text },
  heroIntro: { ...compactType.body, fontFamily: nativeFonts.regular, color: x.day.textSecondary },
  heroMascot: { position: 'absolute', right: 0, bottom: 0, width: 120, height: 130, zIndex: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  fieldCompact: { flex: 1, gap: spacing.sm },
  fieldIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.day.tintExplore,
  },
  fieldLabel: { ...compactType.label, fontFamily: nativeFonts.regular, color: x.day.textSecondary },
  fieldCode: { fontSize: 24, lineHeight: 30, fontFamily: nativeFonts.bold, color: x.day.text },
  fieldName: {
    ...compactType.body,
    flexShrink: 1,
    fontFamily: nativeFonts.regular,
    color: x.day.textSecondary,
  },
  fieldPlaceholder: { ...compactType.body, fontFamily: nativeFonts.semibold, color: x.day.textSecondary },
  fieldValue: { ...compactType.body, fontFamily: nativeFonts.semibold, color: x.day.text },
  swap: {
    position: 'absolute',
    right: 56,
    top: '50%',
    marginTop: -20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  strip: { gap: spacing.sm },
  stripDay: {
    minWidth: 76,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  stripDaySelected: { borderColor: x.day.link, backgroundColor: x.day.tintExplore },
  stripWeekday: { ...compactType.label, fontFamily: nativeFonts.regular, color: x.day.textSecondary },
  stripPrice: { ...compactType.body, fontFamily: nativeFonts.semibold, color: x.day.text },
  stripPriceLow: { color: x.day.text },
  sorts: { gap: spacing.sm },
  tag: {
    ...compactType.label,
    fontFamily: nativeFonts.semibold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  tagCoral: { backgroundColor: x.action.primary, color: x.action.onPrimary },
  tagTeal: { backgroundColor: x.day.link, color: x.brand.white },
  airlineBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.day.link,
  },
  airlineLogo: { width: 120, height: 28 },
  baggage: {
    ...compactType.label,
    fontFamily: nativeFonts.semibold,
    color: x.day.link,
    backgroundColor: x.day.tintExplore,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  airline: { ...compactType.body, fontFamily: nativeFonts.semibold, color: x.day.text },
  flightMeta: { ...compactType.label, fontFamily: nativeFonts.regular, color: x.day.textSecondary },
  time: { fontSize: 24, lineHeight: 30, fontFamily: nativeFonts.bold, color: x.day.text },
  airport: { ...compactType.label, fontFamily: nativeFonts.semibold, color: x.day.textSecondary },
  line: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 4 },
  lineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: x.day.line },
  lineRule: { flex: 1, height: 1, backgroundColor: x.day.line },
  direct: { ...compactType.label, fontFamily: nativeFonts.semibold, color: x.day.link },
});

/** Bỏ dấu, chữ thường để tìm "da nang" ra Đà Nẵng. */
const foldText = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Danh sách sân bay trong sheet chọn: ô tìm, ô mã sân bay, tên thành phố và tên sân bay, dấu tích chỗ đang chọn. */
export function AirportPickerList({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  const [query, setQuery] = useState('');
  const needle = foldText(query.trim());
  const shown = needle ? options.filter((option) => foldText(option.label).includes(needle)) : options;
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={pickerStyles.search}>
        <Icon name="search-outline" size={18} color={x.day.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={copy.searchAirport}
          placeholderTextColor={x.day.textSecondary}
          accessibilityLabel={copy.searchAirport}
          style={pickerStyles.searchInput}
        />
      </View>
      {shown.map(({ value, label }) => {
        const [, city = value, ...rest] = label.split(' · ');
        const isSelected = value === selected;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(value)}
            style={({ pressed }) => [
              pickerStyles.row,
              isSelected && pickerStyles.rowSelected,
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[pickerStyles.code, isSelected && pickerStyles.codeSelected]}>
              <Txt style={[pickerStyles.codeText, isSelected && { color: x.brand.white }]}>{value}</Txt>
            </View>
            <View style={ui.flex}>
              <Txt style={pickerStyles.city}>{city}</Txt>
              {rest.length > 0 && (
                <Txt variant="small" style={ui.muted}>
                  {rest.join(' · ')}
                </Txt>
              )}
            </View>
            {isSelected && <Icon name="checkmark-circle" size={22} color={x.day.link} />}
          </Pressable>
        );
      })}
      {!shown.length && (
        <Txt variant="small" style={ui.muted}>
          {copy.noAirportMatch}
        </Txt>
      )}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.canvas,
  },
  searchInput: {
    ...compactType.body,
    flex: 1,
    minHeight: 44,
    fontFamily: nativeFonts.regular,
    color: x.day.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  rowSelected: { borderColor: x.day.link, backgroundColor: x.day.tintExplore },
  code: {
    width: 52,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.day.tintExplore,
  },
  codeSelected: { backgroundColor: x.day.link },
  codeText: { ...compactType.body, fontFamily: nativeFonts.bold, color: x.day.link, letterSpacing: 0.5 },
  city: { ...compactType.body, fontFamily: nativeFonts.semibold, color: x.day.text },
});

/** Logo hãng; không có logo thì tên hãng (hoặc biểu tượng máy bay). */
export function FlightAirlineMark({
  airline,
  airlineCode,
}: {
  airline: string | null;
  airlineCode: string | null;
}) {
  const code = resolveAirlineCode(airlineCode, airline);
  const logo = code ? AIRLINE_LOGOS[code] : undefined;
  if (logo)
    return <Image source={logo} contentFit="contain" contentPosition="left" style={styles.airlineLogo} />;
  return (
    <Txt style={styles.airline} numberOfLines={1}>
      {airline ?? code ?? '✈'}
    </Txt>
  );
}
