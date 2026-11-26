import {
  useTripAddons,
  type TripAddonFlight,
  type TripAddonRequest,
  type TripAddonStay,
} from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ApiErrorNotice } from '@/components/api-state';
import { LoadingDots } from '@/components/loading-dots';
import { typeStyle } from '@/components/type-scale';
import { Icon, money, Row, Txt, ui } from '@/components/mobile-ui';
import { ChoiceChip } from './trip-plan-parts';

const copy = vi.mobile.tripAddons;
const ALL_GROUP = 'all';

export interface TripAddonPicks {
  outbound: TripAddonFlight | null;
  inbound: TripAddonFlight | null;
}

export const NO_ADDON_PICKS: TripAddonPicks = { outbound: null, inbound: null };

/**
 * Gợi ý phần còn thiếu của chuyến trước khi giữ chỗ (TF39): có phòng thì vé khứ hồi, có vé thì chỗ ở.
 * Vé chọn ở đây được gửi chung với các mục cũ trong một POST /checkout (bên gọi gộp `picks`).
 * Khách sạn gợi ý chưa có loại phòng nên bấm vào thì bên gọi mở màn chọn phòng (`onPickStay`).
 */
export function TripAddonsSection({
  request,
  picks,
  onChangePicks,
  onChangeFrom,
  onPickStay,
}: {
  request: TripAddonRequest | null;
  picks: TripAddonPicks;
  onChangePicks: (picks: TripAddonPicks) => void;
  onChangeFrom: (airport: string) => void;
  onPickStay?: (stay: TripAddonStay, dates: { checkIn: string; checkOut: string }) => void;
}) {
  const addons = useTripAddons(request);
  if (!request) return null;
  if (addons.isPending) return <LoadingDots />;
  if (addons.error) return <ApiErrorNotice error={addons.error} retry={() => void addons.refetch()} />;
  const { flights, stays } = addons.data;

  if (flights) {
    return (
      <Section
        tone="flight"
        icon="airplane"
        title={t('mobile.tripAddons.flightsTitle', { place: flights.destination.name })}
      >
        <Txt style={styles.muted}>{t('mobile.tripAddons.flightsBody', { adults: request.adults })}</Txt>
        {flights.origins.length > 1 && (
          <Row style={styles.originRow}>
            <Txt style={styles.muted}>{copy.flyFrom}</Txt>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {flights.origins.map((code) => (
                <ChoiceChip
                  key={code}
                  label={code}
                  isSelected={code === flights.fromAirport}
                  onPress={() => onChangeFrom(code)}
                />
              ))}
            </ScrollView>
          </Row>
        )}
        {(['outbound', 'inbound'] as const).map((leg) => (
          <FlightLeg
            key={leg}
            title={t(leg === 'outbound' ? 'mobile.tripAddons.outbound' : 'mobile.tripAddons.inbound', {
              date: formatShortDate(leg === 'outbound' ? flights.departDate : flights.returnDate),
            })}
            leg={flights[leg]}
            picked={picks[leg]}
            onPick={(flight) => onChangePicks({ ...picks, [leg]: flight })}
          />
        ))}
      </Section>
    );
  }

  if (stays) {
    return (
      <Section tone="hotel" icon="bed" title={t('mobile.tripAddons.staysTitle', { place: stays.place.name })}>
        <Txt style={styles.muted}>
          {t('mobile.tripAddons.staysBody', {
            checkIn: formatShortDate(stays.checkIn),
            checkOut: formatShortDate(stays.checkOut),
          })}
        </Txt>
        <Grouped
          tone="hotel"
          items={stays.items}
          idOf={(stay) => stay.hotelId}
          groups={stays.groups}
          render={(stay) => (
            <Option
              key={stay.hotelId}
              tone="hotel"
              isSelected={false}
              onPress={() => onPickStay?.(stay, { checkIn: stays.checkIn, checkOut: stays.checkOut })}
              title={stay.name}
              detail={[
                stay.stars ? `${stay.stars}★` : null,
                t('mobile.tripAddons.perNight', { amount: money(stay.unitPrice) }),
                stay.rating ? `${stay.rating.average}/5` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              price={money(stay.totalPrice)}
              badge={stay.badges[0]?.text}
              trailing={<Icon name="chevron-forward" size={18} color={x.day.text} />}
            />
          )}
        />
      </Section>
    );
  }
  return null;
}

function FlightLeg({
  title,
  leg,
  picked,
  onPick,
}: {
  title: string;
  leg: { items: TripAddonFlight[]; groups: { code: string; label: string; ids: string[] }[] };
  picked: TripAddonFlight | null;
  onPick: (flight: TripAddonFlight | null) => void;
}) {
  return (
    <View style={styles.leg}>
      <Txt style={styles.legTitle}>{title}</Txt>
      <Grouped
        tone="flight"
        items={leg.items}
        idOf={(flight) => flight.flightKey}
        groups={leg.groups}
        render={(flight) => (
          <Option
            key={flight.flightKey}
            tone="flight"
            isSelected={picked?.flightKey === flight.flightKey}
            onPress={() => onPick(flight)}
            title={`${flight.departTime ?? '--:--'} → ${flight.arriveTime ?? '--:--'} · ${flight.fromAirport} → ${flight.toAirport}`}
            // Giá mỗi người đã nằm trong nhãn của nhóm (Rẻ nhất · …/người) nên dòng này chỉ ghi hãng bay.
            detail={flight.airline ?? undefined}
            price={money(flight.totalPrice)}
            badge={flight.badges[0]?.text}
          />
        )}
        footer={<Option tone="flight" isSelected={!picked} onPress={() => onPick(null)} title={copy.none} />}
      />
    </View>
  );
}

/** Chip nhóm tiêu chí (Tất cả, Rẻ nhất, Giờ đẹp…) và danh sách theo nhóm đang chọn, đúng thứ tự BE trả. */
function Grouped<T>({
  tone,
  items,
  idOf,
  groups,
  render,
  footer,
}: {
  tone: 'flight' | 'hotel';
  items: T[];
  idOf: (item: T) => string;
  groups: { code: string; label: string; ids: string[] }[];
  render: (item: T) => ReactNode;
  footer?: ReactNode;
}) {
  const [group, setGroup] = useState(groups[0]?.code ?? ALL_GROUP);
  const active = groups.find((g) => g.code === group);
  const byId = new Map(items.map((item) => [idOf(item), item]));
  const shown = active ? active.ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])) : items;
  return (
    <View style={styles.options}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <ChoiceChip
          label={t('mobile.tripAddons.all', { count: items.length })}
          isSelected={!active}
          onPress={() => setGroup(ALL_GROUP)}
        />
        {groups.map((g) => (
          <ChoiceChip
            key={g.code}
            label={g.label}
            isSelected={g.code === group}
            onPress={() => setGroup(g.code)}
          />
        ))}
      </ScrollView>
      {shown.length === 0 && <Txt style={styles.muted}>{copy.empty}</Txt>}
      {shown.map(render)}
      {footer}
    </View>
  );
}

const TONES = {
  flight: { ink: x.day.link, soft: x.day.tintExplore },
  hotel: { ink: x.day.text, soft: x.day.tintWarm },
} as const;

function Section({
  tone,
  icon,
  title,
  children,
}: {
  tone: keyof typeof TONES;
  icon: 'airplane' | 'bed';
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, { borderColor: TONES[tone].ink, backgroundColor: TONES[tone].soft }]}>
      <Row style={styles.sectionHead}>
        <Icon name={icon} size={18} color={TONES[tone].ink} />
        <Txt style={styles.sectionTitle}>{title}</Txt>
      </Row>
      {children}
    </View>
  );
}

function Option({
  tone,
  isSelected,
  onPress,
  title,
  detail,
  price,
  badge,
  trailing,
}: {
  tone: keyof typeof TONES;
  isSelected: boolean;
  onPress: () => void;
  title: string;
  detail?: string;
  price?: string;
  badge?: string;
  trailing?: ReactNode;
}) {
  const ink = TONES[tone].ink;
  return (
    <Pressable
      accessibilityRole={trailing ? 'button' : 'radio'}
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, isSelected && { borderColor: ink }, pressed && styles.pressed]}
    >
      {!trailing && (
        <Icon
          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={isSelected ? ink : x.day.textSecondary}
        />
      )}
      <View style={ui.flex}>
        <Txt style={styles.optionTitle} numberOfLines={2}>
          {title}
        </Txt>
        {!!detail && <Txt style={styles.muted}>{detail}</Txt>}
        {!!badge && (
          <View style={[styles.badge, { backgroundColor: TONES[tone].soft }]}>
            <Txt style={[styles.badgeText, { color: ink }]}>{badge}</Txt>
          </View>
        )}
      </View>
      {!!price && <Txt style={styles.price}>{price}</Txt>}
      {trailing}
    </Pressable>
  );
}

export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  muted: { ...typeStyle('label'), fontFamily: nativeFonts.regular, color: x.day.textSecondary },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  sectionHead: { alignItems: 'center', gap: spacing.xs },
  sectionTitle: { ...typeStyle('subhead'), fontFamily: nativeFonts.bold, color: x.day.text, flexShrink: 1 },
  originRow: { alignItems: 'center', gap: spacing.sm },
  chips: { gap: spacing.sm },
  leg: { gap: spacing.sm },
  legTitle: { ...typeStyle('bodyStrong'), fontFamily: nativeFonts.semibold, color: x.day.link },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: x.day.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionTitle: { ...typeStyle('bodyStrong'), fontFamily: nativeFonts.semibold, color: x.day.text },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: { ...typeStyle('caption'), fontFamily: nativeFonts.semibold },
  price: { ...typeStyle('bodyStrong'), fontFamily: nativeFonts.bold, color: x.day.price },
});
