import { colors as c, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { assets, Badge, copy, IconButton, money, Row, Txt, ui } from '@/components/mobile-ui';
import { useReview } from '@/features/review/review-provider';

export function TripCard({ compact = false }: { compact?: boolean }) {
  const review = useReview();
  return (
    <View style={[ui.card, { padding: 0, overflow: 'hidden', flex: compact ? 1 : undefined }]}>
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.common.tripName}
          onPress={() => router.push('/itinerary')}
        >
          <Image
            source={assets.beach}
            style={{ height: compact ? 144 : 180, width: '100%' }}
            contentFit="cover"
          />
        </Pressable>
        <View style={{ position: 'absolute', right: s.sm, top: s.sm }}>
          <IconButton
            light
            name={review.isSaved ? 'bookmark' : 'bookmark-outline'}
            label={review.isSaved ? copy.common.saved : copy.common.save}
            onPress={() => review.requireAccount('save', '/(tabs)/explore')}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/itinerary')}
        style={{ padding: s.lg, paddingTop: s.xs, gap: s.sm }}
      >
        <Badge icon="checkmark-circle-outline">{copy.common.verified}</Badge>
        <Txt variant="label">{copy.common.tripName}</Txt>
        <Txt variant="caption" style={ui.muted}>
          {copy.common.duration}
        </Txt>
        <Row style={{ gap: s.xs, flexWrap: 'wrap' }}>
          <Txt variant="label" style={{ color: c.coralInk }}>
            {money(3_390_000)}
          </Txt>
          <Txt variant="caption" style={ui.muted}>
            {copy.common.perGuest}
          </Txt>
        </Row>
      </Pressable>
    </View>
  );
}
