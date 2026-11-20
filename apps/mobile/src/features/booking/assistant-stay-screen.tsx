import { useState } from 'react';
import { getFutureDate } from '@tripflix/api-client';
import { isValidAssistantStay, isValidTripDate, isValidTripPlanPassengers } from '@tripflix/app-core';
import { colors, nativeFonts, spacing } from '@tripflix/tokens';
import { t, vi } from '@tripflix/i18n';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { DateRangeField } from '@/components/date-sheet';
import { Button, Icon, Notice, Row, Screen, Txt } from '@/components/mobile-ui';
import { Stepper } from './cart-ui';

const text = vi.assistant.stayReview;

/** Confirm the latest Tripi search before requesting live hotel prices. */
export function AssistantStayScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    infants?: string;
  }>();
  const [stay, setStay] = useState({
    checkIn: params.checkIn ?? '',
    checkOut: params.checkOut ?? '',
    adults: Number(params.adults ?? 2),
    children: Number(params.children ?? 0),
    infants: Number(params.infants ?? 0),
  });
  const today = getFutureDate(0);
  const validDates = isValidTripDate(stay.checkIn, today) && isValidTripDate(stay.checkOut, stay.checkIn);
  const valid = !!params.id && isValidAssistantStay(stay, today);
  const count = stay.adults + stay.children + stay.infants;
  const validParty = isValidTripPlanPassengers(stay, 9) && count <= 9;
  return (
    <Screen
      title={text.title}
      background={colors.surface}
      footer={
        <Button
          style={{ borderRadius: 8, backgroundColor: colors.coralInk }}
          disabled={!valid}
          icon="arrow-forward"
          onPress={() =>
            router.replace({
              pathname: '/hotel/[id]',
              params: {
                id: params.id!,
                fromTripi: '1',
                checkIn: stay.checkIn,
                checkOut: stay.checkOut,
                adults: String(stay.adults),
                children: String(stay.children),
                infants: String(stay.infants),
              },
            })
          }
        >
          {text.confirm}
        </Button>
      }
    >
      <View style={styles.intro}>
        <Icon name="sunny-outline" size={30} color={colors.navy} />
        <Txt style={styles.eyebrow}>{text.eyebrow}</Txt>
        <Txt style={styles.title}>{text.heading}</Txt>
        <Txt style={styles.body}>{params.name ?? text.fallbackName}</Txt>
      </View>
      <Txt style={styles.description}>{text.description}</Txt>
      {!params.id && <Notice tone="error">{text.missingHotel}</Notice>}
      <View style={styles.section}>
        <Row style={styles.heading}>
          <Icon name="calendar-outline" size={22} color={colors.tealInk} />
          <Txt style={styles.sectionTitle}>{text.dates}</Txt>
        </Row>
        <DateRangeField
          cornerRadius={8}
          startLabel={text.checkIn}
          endLabel={text.checkOut}
          start={stay.checkIn}
          end={stay.checkOut}
          min={getFutureDate(1)}
          onChange={({ start, end }) =>
            setStay((previous) => ({ ...previous, checkIn: start, checkOut: end }))
          }
        />
        {!validDates && (
          <Txt accessibilityRole="alert" style={styles.error}>
            {text.invalidDates}
          </Txt>
        )}
        {validDates && (
          <Txt style={styles.description}>
            {t('assistant.stayReview.nights', {
              count: Math.round((Date.parse(stay.checkOut) - Date.parse(stay.checkIn)) / 86_400_000),
            })}
          </Txt>
        )}
      </View>
      <View style={[styles.section, styles.party]}>
        <Row style={styles.heading}>
          <Icon name="people-outline" size={22} color={colors.tealInk} />
          <Txt style={styles.sectionTitle}>{text.party}</Txt>
        </Row>
        {(['adults', 'children', 'infants'] as const).map((key) => {
          const label =
            key === 'adults'
              ? vi.hotel.adultsLabel
              : key === 'children'
                ? vi.hotel.childrenLabel
                : vi.hotel.infantsLabel;
          return (
            <Row key={key} style={styles.guestRow}>
              <View style={styles.guestLabel}>
                <Txt style={styles.body}>{label}</Txt>
                {key !== 'adults' && (
                  <Txt style={styles.description}>
                    {key === 'children' ? vi.hotel.childrenHint : vi.hotel.infantsHint}
                  </Txt>
                )}
              </View>
              <Stepper
                label={label}
                value={stay[key]}
                canDecrease={stay[key] > (key === 'adults' ? 1 : 0)}
                canIncrease={count < 9 && (key !== 'infants' || stay.infants < stay.adults)}
                onChange={(value) => setStay((previous) => ({ ...previous, [key]: value }))}
              />
            </Row>
          );
        })}
        {!validParty && (
          <Txt accessibilityRole="alert" style={styles.error}>
            {text.invalidParty}
          </Txt>
        )}
        <Txt style={styles.description}>{text.priceNotice}</Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { backgroundColor: colors.sun, borderRadius: 8, padding: spacing.lg, gap: spacing.sm },
  eyebrow: { fontSize: 12, lineHeight: 20, fontFamily: nativeFonts.semibold, color: colors.navy },
  title: { fontSize: 28, lineHeight: 38, fontFamily: nativeFonts.bold, color: colors.navy },
  body: { fontSize: 15, lineHeight: 24, color: colors.navy, fontFamily: nativeFonts.medium },
  description: { fontSize: 13, lineHeight: 22, color: colors.textMuted },
  section: { gap: spacing.md, paddingVertical: spacing.md },
  heading: { alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 17, lineHeight: 26, fontFamily: nativeFonts.semibold, color: colors.navy },
  party: { backgroundColor: colors.seaMist, padding: spacing.md, borderRadius: 8 },
  guestRow: { justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  guestLabel: { flex: 1, gap: spacing.xs },
  error: { color: colors.coralInk, fontSize: 13, lineHeight: 22 },
});
