import { useQuery } from '@tanstack/react-query';
import {
  EMPTY_TRIP_PLAN_DAY,
  TRIP_PLAN_MAX_DAYS,
  type TripPlanDayDraft,
  type TripPlanDraft,
  type TripPlanMode,
} from '@tripflix/app-core';
import { readPage, useApiSession, useFlightRoutes } from '@tripflix/api-client';
import { suggestControllerSuggest } from '@tripflix/api-client/core-api/discovery/discovery';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, spacing } from '@tripflix/tokens';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Field, IconButton, Row, Txt } from '@/components/mobile-ui';

const copy = vi.mobile.tripPlan.editor;
const MODES: readonly TripPlanMode[] = ['flight', 'bus', 'train', 'car', 'other'];

/** Soạn lộ trình theo ngày: hoạt động, phương tiện (máy bay chọn sân bay có tuyến thật), chỗ ở (khách sạn có bán). */
export function TripPlanEditor({
  draft,
  onChange,
}: {
  draft: TripPlanDraft;
  onChange: (draft: TripPlanDraft) => void;
}) {
  const routes = useFlightRoutes();
  const updateDay = (index: number, patch: Partial<TripPlanDayDraft>) =>
    onChange({ ...draft, days: draft.days.map((day, i) => (i === index ? { ...day, ...patch } : day)) });
  return (
    <View style={styles.root}>
      <Field
        label={copy.destination}
        value={draft.destinationName}
        onChangeText={(value) => onChange({ ...draft, destinationName: value })}
        maxLength={100}
      />
      <HotelPicker hotel={draft.hotel} onChange={(hotel) => onChange({ ...draft, hotel })} />
      <Txt variant="caption" style={styles.muted}>{copy.bookingHint}</Txt>
      {draft.days.map((day, index) => {
        const origins = routes.data?.map((route) => route.airport) ?? [];
        const destinations =
          routes.data
            ?.find((route) => route.airport === day.transport.fromCode)
            ?.destinations.map((d) => d.code) ?? [];
        return (
          <View key={index} style={styles.day}>
            <Row style={styles.dayHeader}>
              <Txt variant="label">{t('mobile.tripPlan.day', { day: index + 1 })}</Txt>
              {draft.days.length > 1 && (
                <IconButton
                  name="trash-outline"
                  label={t('mobile.tripPlan.editor.removeDay', { day: index + 1 })}
                  onPress={() => onChange({ ...draft, days: draft.days.filter((_, i) => i !== index) })}
                />
              )}
            </Row>
            <Txt variant="caption" style={styles.muted}>
              {copy.activity}
            </Txt>
            {day.activities.map((activity, activityIndex) => (
              <View key={activityIndex} style={styles.activity}>
                <Field
                  label={`${copy.activity} ${activityIndex + 1}`}
                  placeholder={copy.activityPlaceholder}
                  value={activity.title}
                  maxLength={200}
                  onChangeText={(value) =>
                    updateDay(index, {
                      activities: day.activities.map((a, i) =>
                        i === activityIndex ? { ...a, title: value } : a,
                      ),
                    })
                  }
                />
              </View>
            ))}
            <Button
              tone="text"
              icon="add"
              onPress={() =>
                updateDay(index, { activities: [...day.activities, { title: '', location: '' }] })
              }
            >
              {copy.addActivity}
            </Button>
            <Txt variant="caption" style={styles.muted}>
              {copy.transport}
            </Txt>
            <Row style={styles.chips}>
              <Chip
                selected={!day.transport.mode}
                onPress={() => updateDay(index, { transport: { ...day.transport, mode: null } })}
              >
                {copy.noTransport}
              </Chip>
              {MODES.map((mode) => (
                <Chip
                  key={mode}
                  selected={day.transport.mode === mode}
                  onPress={() => updateDay(index, { transport: { ...day.transport, mode } })}
                >
                  {vi.mobile.tripPlan.modes[mode]}
                </Chip>
              ))}
            </Row>
            {day.transport.mode === 'flight' && (
              <>
                <Txt variant="caption" style={styles.muted}>
                  {copy.fromCode}
                </Txt>
                <Row style={styles.chips}>
                  {origins.map((code) => (
                    <Chip
                      key={code}
                      selected={day.transport.fromCode === code}
                      onPress={() =>
                        updateDay(index, { transport: { ...day.transport, fromCode: code, toCode: '' } })
                      }
                    >
                      {code}
                    </Chip>
                  ))}
                </Row>
                {!!day.transport.fromCode && (
                  <>
                    <Txt variant="caption" style={styles.muted}>
                      {copy.toCode}
                    </Txt>
                    <Row style={styles.chips}>
                      {destinations.map((code) => (
                        <Chip
                          key={code}
                          selected={day.transport.toCode === code}
                          onPress={() => updateDay(index, { transport: { ...day.transport, toCode: code } })}
                        >
                          {code}
                        </Chip>
                      ))}
                    </Row>
                  </>
                )}
              </>
            )}
            {!!day.transport.mode && day.transport.mode !== 'flight' && (
              <Field
                label={copy.transportNote}
                value={day.transport.note}
                maxLength={200}
                onChangeText={(value) => updateDay(index, { transport: { ...day.transport, note: value } })}
              />
            )}
          </View>
        );
      })}
      {draft.days.length < TRIP_PLAN_MAX_DAYS && (
        <Button
          tone="secondary"
          icon="add"
          onPress={() => onChange({ ...draft, days: [...draft.days, EMPTY_TRIP_PLAN_DAY] })}
        >
          {copy.addDay}
        </Button>
      )}
    </View>
  );
}

function HotelPicker({
  hotel: picked,
  onChange,
}: {
  hotel: TripPlanDraft['hotel'];
  onChange: (hotel: TripPlanDraft['hotel']) => void;
}) {
  const { isReady } = useApiSession();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const hotels = useQuery({
    queryKey: ['discovery', 'suggest', 'hotel', query],
    enabled: isReady && query.length >= 2,
    queryFn: async ({ signal }) =>
      readPage((await suggestControllerSuggest({ q: query, types: 'hotel' }, { signal })).data),
  });
  if (picked) {
    return (
      <View style={styles.activity}>
        <Txt variant="caption" style={styles.muted}>
          {copy.hotel}
        </Txt>
        <Row style={styles.dayHeader}>
          <Txt variant="label" style={styles.flex}>
            {picked.hotelName}
          </Txt>
          <IconButton name="close" label={copy.clearHotel} onPress={() => onChange(null)} />
        </Row>
      </View>
    );
  }
  return (
    <View style={styles.activity}>
      <Field
        label={copy.hotel}
        placeholder={copy.hotelSearch}
        value={text}
        onChangeText={setText}
        maxLength={100}
      />
      <Row style={styles.chips}>
        {(hotels.data?.items ?? [])
          .filter((hotel) => hotel.type === 'hotel')
          .slice(0, 6)
          .map((hotel) => (
            <Chip key={hotel.id} onPress={() => onChange({ hotelId: hotel.refId, hotelName: hotel.name })}>
              {hotel.name}
            </Chip>
          ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  day: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: mobileLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dayHeader: { alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  activity: { gap: spacing.xs },
  chips: { flexWrap: 'wrap', gap: spacing.sm },
  muted: { color: colors.textMuted },
  flex: { flex: 1 },
});
