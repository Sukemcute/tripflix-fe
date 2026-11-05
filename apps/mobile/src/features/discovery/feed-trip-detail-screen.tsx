import { getDemoTrip } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { colors as c, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import {
  assets,
  Badge,
  Button,
  Card,
  copy,
  Empty,
  IconButton,
  money,
  Notice,
  Row,
  Screen,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { useReview } from '@/features/review/review-provider';

export function FeedTripDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const review = useReview();
  const trip = getDemoTrip(slug ?? '');
  if (!trip)
    return (
      <Screen>
        <Empty
          title={vi.demo.web.notFoundTitle}
          body={vi.demo.web.notFoundBody}
          action={vi.demo.feed.back}
          onAction={() => router.replace('/(tabs)')}
        />
      </Screen>
    );
  const content = vi.demo.trips[trip.slug];
  return (
    <Screen
      title={vi.demo.common.detail}
      right={
        <IconButton
          name={review.isTripSaved(trip.slug) ? 'bookmark' : 'bookmark-outline'}
          label={copy.common.save}
          onPress={() =>
            review.requireAccount(
              'save',
              { pathname: '/trip/[slug]', params: { slug: trip.slug } },
              trip.slug,
            )
          }
        />
      }
    >
      <Image
        source={assets[trip.image]}
        contentFit="cover"
        style={{ height: 240, width: '100%', borderRadius: 20 }}
      />
      <Badge>{vi.demo.common.badge}</Badge>
      <Txt variant="title">{content.title}</Txt>
      <Txt variant="small" style={ui.muted}>
        {content.destination} · {trip.days} {vi.demo.common.days} {trip.nights} {vi.demo.common.nights}
      </Txt>
      <Txt>{content.summary}</Txt>
      <Notice>{vi.demo.feed.guideBody}</Notice>
      <Txt variant="heading">{vi.demo.common.itinerary}</Txt>
      {content.days.map((day, index) => (
        <Row key={day} style={{ alignItems: 'flex-start', gap: s.md }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: c.seaMist,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt variant="label" style={{ color: c.tealInk }}>
              {index + 1}
            </Txt>
          </View>
          <View style={ui.flex}>
            <Txt variant="label">
              {copy.itinerary.day} {index + 1}
            </Txt>
            <Txt variant="small" style={ui.muted}>
              {day}
            </Txt>
          </View>
        </Row>
      ))}
      <Card>
        <Txt variant="heading">{content.stay}</Txt>
        <Txt variant="small" style={ui.muted}>
          {content.stayBody}
        </Txt>
        <Txt variant="caption">{vi.demo.common.reference}</Txt>
        <Txt variant="heading">
          {money(trip.pricePerGuest)} {vi.demo.common.perGuest}
        </Txt>
      </Card>
      <Button tone="secondary" onPress={() => router.replace('/(tabs)')}>
        {vi.demo.feed.back}
      </Button>
    </Screen>
  );
}
