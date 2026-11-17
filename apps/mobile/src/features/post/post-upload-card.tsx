import { t, vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Row, Txt } from '@/components/mobile-ui';
import { dismissPostUpload, retryPostUpload, usePostUpload } from './post-upload-store';

const copy = vi.mobile.create;

/** Thẻ tiến độ của bài đang đăng nền, hiện ở "Bài đăng của tôi" (giống TikTok). */
export function PostUploadCard() {
  const job = usePostUpload();
  if (!job) return null;
  const isRunning = job.phase !== 'done' && job.phase !== 'failed';
  const label =
    job.phase === 'done'
      ? copy.bgDone
      : job.phase === 'failed'
        ? copy.bgFailed
        : t(
            job.phase === 'compressing'
              ? 'mobile.create.bgCompressing'
              : job.phase === 'uploading'
                ? 'mobile.create.bgUploading'
                : 'mobile.create.bgPublishing',
            { percent: job.percent },
          );
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.thumb}>
        {isRunning ? (
          <>
            <ActivityIndicator color={colors.background} />
            <Txt style={styles.thumbText}>{job.percent}%</Txt>
          </>
        ) : (
          <Icon
            name={job.phase === 'done' ? 'checkmark-circle' : 'alert-circle'}
            size={26}
            color={colors.background}
          />
        )}
      </View>
      <View style={styles.body}>
        <Txt variant="label" numberOfLines={1}>
          {job.title}
        </Txt>
        <Txt variant="caption" style={{ color: job.phase === 'failed' ? colors.coralInk : colors.textMuted }}>
          {label}
        </Txt>
        {isRunning && (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${job.percent}%` }]} />
          </View>
        )}
        {!isRunning && (
          <Row style={styles.actions}>
            {job.phase === 'failed' ? (
              <Pressable accessibilityRole="button" onPress={retryPostUpload}>
                <Txt variant="label" style={styles.action}>
                  {copy.bgRetry}
                </Txt>
              </Pressable>
            ) : (
              job.postId && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const postId = job.postId!;
                    dismissPostUpload();
                    router.push({ pathname: '/trip/[slug]', params: { slug: postId } });
                  }}
                >
                  <Txt variant="label" style={styles.action}>
                    {copy.bgView}
                  </Txt>
                </Pressable>
              )
            )}
            <Pressable accessibilityRole="button" onPress={dismissPostUpload}>
              <Txt variant="label" style={styles.muted}>
                {copy.bgClose}
              </Txt>
            </Pressable>
          </Row>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignSelf: 'stretch',
  },
  thumb: {
    width: 56,
    height: 74,
    borderRadius: radius.sm,
    backgroundColor: colors.tealInk,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  thumbText: { color: colors.background, fontSize: 12, fontWeight: '700' },
  body: { flex: 1, justifyContent: 'center', gap: 4 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.tealInk },
  actions: { gap: spacing.lg },
  action: { color: colors.tealInk },
  muted: { color: colors.textMuted },
});
