import { useSummaryExperience } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors as c, mobileLayout, radius, spacing as s } from '@tripflix/tokens';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Mascot, Notice, Txt } from '@/components/mobile-ui';

const copy = vi.summary;

export function CommunitySummary({ postId }: { postId: string }) {
  const flow = useSummaryExperience(postId);
  const { query, isOpen } = flow;
  const summary = query.data;
  const isResult = isOpen && summary?.status === 'ready' && !flow.isLoading;
  const emptyStatus = summary && summary.status !== 'ready' ? summary.status : null;
  return (
    <View style={styles.root} testID="community-summary">
      <View style={styles.header}>
        <Mascot pose={flow.isLoading ? 'curious' : isResult ? 'celebrate' : 'curious'} size={48} />
        <View style={styles.heading}>
          <View style={styles.sectionHeading}>
            <Txt variant="label">{isResult ? copy.resultTitle : copy.title}</Txt>
            <Txt style={styles.ai}>{copy.badge}</Txt>
          </View>
          <Txt variant="caption" style={styles.muted}>
            {isResult ? t('summary.basedOn', { count: summary.commentCount }) : copy.intro}
          </Txt>
        </View>
        {isOpen && !flow.isLoading && <IconButton name="close" label={copy.dismiss} onPress={flow.close} />}
      </View>
      {!isOpen ? (
        <Pressable
          accessibilityRole="button"
          disabled={!flow.isReady}
          accessibilityState={{ disabled: !flow.isReady }}
          onPress={flow.open}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Icon name="sparkles-outline" color={c.background} size={18} />
          <Txt variant="label" style={styles.white}>
            {summary ? copy.cached : copy.open}
          </Txt>
        </Pressable>
      ) : flow.isLoading ? (
        <View style={styles.body} accessibilityLiveRegion="polite">
          <Txt variant="label">{query.fetchStatus === 'paused' ? copy.offline : copy.loading}</Txt>
          <Txt variant="caption" style={styles.muted}>
            {copy.loadingHint}
          </Txt>
          <View style={styles.skeleton} />
          <View style={[styles.skeleton, { width: '65%' }]} />
          <Pressable accessibilityRole="button" style={styles.textAction} onPress={flow.cancel}>
            <Txt style={styles.teal}>{copy.cancel}</Txt>
          </Pressable>
        </View>
      ) : (
        <View style={styles.body}>
          {summary?.hasSafetyWarnings && (
            <View testID="summary-safety">
              <Notice tone="warning">
                <Txt variant="label">{copy.safetyTitle}</Txt>
                {'\n'}
                {copy.safety}
              </Notice>
            </View>
          )}
          {summary?.status === 'ready' ? (
            <Txt selectable>{summary.summary}</Txt>
          ) : (
            !query.error && (
              <View style={styles.point}>
                <Txt variant="label">{emptyStatus ? copy[`${emptyStatus}Title`] : copy.pendingTitle}</Txt>
                <Txt style={styles.muted}>{emptyStatus ? copy[emptyStatus] : copy.pending}</Txt>
                {summary?.status === 'insufficient_data' && !!summary.needed && (
                  <Txt style={styles.muted}>{t('summary.needed', { count: summary.needed })}</Txt>
                )}
              </View>
            )
          )}
          {!!query.error && (
            <Txt accessibilityRole="alert" style={styles.error}>
              {summary ? copy.refreshError : copy.error}
            </Txt>
          )}
          {(summary?.status !== 'ready' || !!query.error) && (
            <View style={styles.footer}>
              <Pressable accessibilityRole="button" style={styles.textAction} onPress={flow.refresh}>
                <Txt variant="caption" style={styles.teal}>
                  {query.error ? copy.retry : copy.refresh}
                </Txt>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: c.warmMist,
    borderRadius: mobileLayout.cardRadius,
    padding: s.md,
    gap: s.md,
    marginBottom: s.sm,
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
  primary: {
    minHeight: mobileLayout.buttonHeight,
    borderRadius: radius.pill,
    backgroundColor: c.coralInk,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.sm,
    paddingHorizontal: s.md,
  },
  white: { color: c.background },
  body: { gap: s.md },
  point: { gap: s.xs },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    minHeight: mobileLayout.touchTarget,
    alignSelf: 'flex-start',
  },
  muted: { color: c.textMuted },
  teal: { color: c.tealInk },
  error: { color: c.coralInk },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: s.sm },
  skeleton: { height: s.md, borderRadius: radius.sm, backgroundColor: c.border },
  pressed: { opacity: 0.75 },
});
