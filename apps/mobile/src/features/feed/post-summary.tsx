import { usePostSummary } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors as c, mobileLayout, radius, spacing as s } from '@tripflix/tokens';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Mascot, Notice, Txt } from '@/components/mobile-ui';
import { CHROME_FADE } from '@/components/motion';

const copy = vi.summary;
const SUMMARY_FADE_IN = FadeIn.duration(CHROME_FADE.duration).reduceMotion(ReduceMotion.System);

/**
 * Tóm tắt bình luận luôn hiện sẵn ở đầu bình luận reel, không cần bấm.
 * Bài chưa có tóm tắt (đang tải, chưa đủ bình luận, lỗi) thì không hiện gì.
 */
export function CommunitySummary({ postId }: { postId: string }) {
  const { data: summary } = usePostSummary(postId, { autoLoad: true });
  if (summary?.status !== 'ready' || !summary.summary) return null;
  return (
    <Animated.View entering={SUMMARY_FADE_IN} style={styles.root} testID="community-summary">
      <View style={styles.header}>
        <Mascot pose="celebrate" size={40} />
        <View style={styles.heading}>
          <View style={styles.sectionHeading}>
            <Txt variant="label">{copy.resultTitle}</Txt>
            <Txt style={styles.ai}>{copy.badge}</Txt>
          </View>
          <Txt variant="caption" style={styles.muted}>
            {t('summary.basedOn', { count: summary.commentCount })}
          </Txt>
        </View>
      </View>
      {summary.hasSafetyWarnings && (
        <View testID="summary-safety">
          <Notice tone="warning">
            <Txt variant="label">{copy.safetyTitle}</Txt>
            {'\n'}
            {copy.safety}
          </Notice>
        </View>
      )}
      <Txt selectable>{summary.summary}</Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: c.warmMist,
    borderRadius: mobileLayout.cardRadius,
    padding: s.md,
    marginBottom: s.sm,
    gap: s.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
  heading: { flex: 1, gap: s.xs },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: s.sm },
  ai: {
    color: c.tealInk,
    backgroundColor: c.seaMist,
    fontSize: 10,
    lineHeight: 16,
    borderRadius: radius.sm,
    paddingHorizontal: s.xs,
    overflow: 'hidden',
  },
  muted: { color: c.textMuted },
});
