import { colors as c, mobileLayout as layout, nativeFonts as f, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  assets,
  Badge,
  Button,
  copy,
  Icon,
  IconButton,
  money,
  Row,
  Sheet,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { useReview } from '@/features/review/review-provider';

export function FeedScreen() {
  const review = useReview();
  const [tab, setTab] = useState(0);
  const [hasComments, setComments] = useState(false);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <StatusBar style="light" />
      <Image source={assets.beach} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} />
      <Row style={styles.top}>
        {[copy.feed.forYou, copy.feed.trending].map((title, index) => (
          <Pressable
            key={title}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === tab }}
            onPress={() => setTab(index)}
            style={[styles.tab, index === tab && { borderBottomColor: c.background }]}
          >
            <Txt variant="label" style={{ color: c.background, opacity: tab === index ? 1 : 0.7 }}>
              {title}
            </Txt>
          </Pressable>
        ))}
        <View style={ui.flex} />
        <IconButton
          name="search-outline"
          label={copy.common.search}
          color={c.background}
          onPress={() => router.push('/search')}
        />
      </Row>
      <View style={ui.flex} />
      <View style={styles.bottom}>
        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: s.md }}>
            <Badge tone="sun" icon="location-outline">
              {copy.common.destination}
            </Badge>
            <Txt variant="title" style={styles.headline}>
              {copy.feed.headline}
            </Txt>
            <Row>
              <View style={styles.avatar}>
                <Txt variant="label">{copy.feed.initials}</Txt>
              </View>
              <Txt variant="label" style={{ color: c.background }}>
                {copy.feed.handle}
              </Txt>
              <Icon name="checkmark-circle-outline" color={c.background} size={20} />
            </Row>
            <Txt variant="small" style={{ color: c.background }}>
              {copy.feed.caption}
            </Txt>
          </View>
          <View style={styles.actions}>
            <View style={styles.action}>
              <IconButton
                name={review.isLiked ? 'heart' : 'heart-outline'}
                label={copy.common.like}
                color={review.isLiked ? c.coral : c.background}
                onPress={() => review.requireAccount('like', '/(tabs)')}
              />
              <Txt variant="caption" style={styles.white}>
                {review.isLiked ? '1.249' : copy.feed.likeCount}
              </Txt>
            </View>
            <View style={styles.action}>
              <IconButton
                name="chatbubble-ellipses-outline"
                label={copy.common.comments}
                color={c.background}
                onPress={() => setComments(true)}
              />
              <Txt variant="caption" style={styles.white}>
                {copy.feed.commentCount}
              </Txt>
            </View>
            <View style={styles.action}>
              <IconButton
                name={review.isSaved ? 'bookmark' : 'bookmark-outline'}
                label={copy.common.save}
                color={c.background}
                onPress={() => review.requireAccount('save', '/(tabs)')}
              />
              <Txt variant="caption" style={styles.white}>
                {review.isSaved ? copy.common.saved : copy.common.save}
              </Txt>
            </View>
            <IconButton
              name="paper-plane-outline"
              label={copy.common.share}
              color={c.background}
              onPress={() => {
                void Share.share({ message: copy.feed.shareMessage }).catch(() => {});
              }}
            />
          </View>
        </Row>
        <View style={styles.trip}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={ui.flex}>
              <Txt variant="label">{copy.common.tripName}</Txt>
              <Txt variant="caption" style={ui.muted}>
                {money(3_390_000)}
                {copy.common.perGuest} · {copy.common.reference}
              </Txt>
            </View>
            <Icon name="arrow-up-outline" />
          </Row>
          <Button icon="arrow-forward" onPress={() => router.push('/itinerary')}>
            {copy.feed.tripCta}
          </Button>
        </View>
        <Txt variant="caption" style={[styles.white, { opacity: 0.8 }]}>
          {copy.feed.coverNotice}
        </Txt>
      </View>
      <Sheet title={copy.feed.commentTitle} visible={hasComments} onClose={() => setComments(false)}>
        <Badge>{copy.common.demo}</Badge>
        <Txt variant="label">{copy.feed.commentAuthor}</Txt>
        <Txt>{copy.feed.comment}</Txt>
      </Sheet>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  top: { paddingHorizontal: layout.gutter, paddingTop: s.md, gap: s.lg },
  tab: {
    minHeight: layout.touchTarget,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: c.transparent,
  },
  bottom: { padding: s.lg, gap: s.sm },
  headline: { color: c.background, fontFamily: f.extraBold, fontSize: 32, lineHeight: 41 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.sunSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { alignItems: 'center', gap: s.sm },
  action: { alignItems: 'center' },
  white: { color: c.background },
  trip: { borderRadius: layout.cardRadius, backgroundColor: c.background, padding: s.md, gap: s.md },
});
