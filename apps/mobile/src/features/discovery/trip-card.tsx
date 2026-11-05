import { getDemoTrip, type DemoTripSlug } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { colors as c, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { assets, Badge, copy, IconButton, money, Row, Txt, ui } from '@/components/mobile-ui';
import { useReview } from '@/features/review/review-provider';

export function TripCard({
  compact = false,
  tripSlug = 'nha-trang',
}: {
  compact?: boolean;
  tripSlug?: DemoTripSlug;
}) {
  const review = useReview();
  const trip = getDemoTrip(tripSlug)!;
  const content = vi.demo.trips[trip.slug];
  const isSaved = review.isTripSaved(tripSlug);
  const open = () =>
    router.push(
      tripSlug === 'nha-trang' ? '/itinerary' : { pathname: '/trip/[slug]', params: { slug: tripSlug } },
    );
  return (
    <View style={[ui.card, { padding: 0, overflow: 'hidden', flex: compact ? 1 : undefined }]}>
      <View>
        <Pressable accessibilityRole="button" accessibilityLabel={content.title} onPress={open}>
          <Image
            source={assets[trip.image]}
            style={{ height: compact ? 144 : 180, width: '100%' }}
            contentFit="cover"
          />
        </Pressable>
        <View style={{ position: 'absolute', right: s.sm, top: s.sm }}>
          <IconButton
            light
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            label={isSaved ? copy.common.saved : copy.common.save}
            onPress={() =>
              review.requireAccount('save', tripSlug === 'nha-trang' ? '/(tabs)/explore' : '/saved', tripSlug)
            }
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={open}
        style={{ padding: s.lg, paddingTop: s.xs, gap: s.sm }}
      >
        <Badge icon="checkmark-circle-outline">
          {tripSlug === 'nha-trang' ? copy.common.verified : copy.common.reference}
        </Badge>
        <Txt variant="label">{content.title}</Txt>
        <Txt variant="caption" style={ui.muted}>
          {trip.days} {vi.demo.common.days} {trip.nights} {vi.demo.common.nights}
        </Txt>
        <Row style={{ gap: s.xs, flexWrap: 'wrap' }}>
          <Txt variant="label" style={{ color: c.coralInk }}>
            {money(trip.pricePerGuest)}
          </Txt>
          <Txt variant="caption" style={ui.muted}>
            {copy.common.perGuest}
          </Txt>
        </Row>
      </Pressable>
    </View>
  );
}
