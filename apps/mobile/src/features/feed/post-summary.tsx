import { useSummaryExperience } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors as c, mobileLayout, radius, spacing as s } from '@tripflix/tokens';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { IconButton, Mascot, Txt } from '@/components/mobile-ui';
import { CHROME_FADE, SHEET_CLOSE_SPRING, SHEET_OPEN_SPRING } from '@/components/motion';

const copy = vi.summary;
const OPEN_HEIGHT = 32;
const OPEN_HIT_SLOP = (mobileLayout.touchTarget - OPEN_HEIGHT) / 2;
const CONTROL_FADE_IN = FadeIn.duration(CHROME_FADE.duration).reduceMotion(ReduceMotion.System);

export function CommunitySummary({ postId }: { postId: string }) {
  const flow = useSummaryExperience(postId);
  const { query, isOpen } = flow;
  const summary = query.data;
  const isResult = isOpen && summary?.status === 'ready' && !flow.isLoading;
  const emptyStatus = summary && summary.status !== 'ready' ? summary.status : null;
  // The body stays mounted while closing, so it can shrink away instead of vanishing.
  const [isBodyMounted, setBodyMounted] = useState(isOpen);
  // Closing with nothing loaded yet keeps the loading view, so "no summary" never flashes by.
  const isBodyLoading = isOpen ? flow.isLoading : !summary;
  const bodyHeight = useSharedValue(0);
  const bodyOpacity = useSharedValue(isOpen ? 1 : 0);
  const measuredHeight = useRef(0);
  // A summary already open when the comments appear should be there, not animate in.
  const shouldSnapToHeight = useRef(isOpen);
  useEffect(() => {
    bodyOpacity.set(withTiming(isOpen ? 1 : 0, CHROME_FADE));
    if (isOpen) {
      // Reopening mid-close gets no new layout event, so it heads back to the known height.
      if (measuredHeight.current > 0) {
        bodyHeight.set(withSpring(measuredHeight.current, SHEET_OPEN_SPRING));
      }
      return;
    }
    bodyHeight.set(
      withSpring(0, SHEET_CLOSE_SPRING, (finished) => {
        if (finished) scheduleOnRN(setBodyMounted, false);
      }),
    );
  }, [isOpen, bodyHeight, bodyOpacity]);
  const onBodyLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    measuredHeight.current = height;
    setBodyMounted(true);
    if (shouldSnapToHeight.current) {
      shouldSnapToHeight.current = false;
      bodyHeight.set(height);
    } else if (isOpen) {
      bodyHeight.set(withSpring(height, SHEET_OPEN_SPRING));
    }
  };
  const bodyFrameStyle = useAnimatedStyle(() => ({ height: bodyHeight.get() }));
  const bodyContentStyle = useAnimatedStyle(() => ({ opacity: bodyOpacity.get() }));
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
        {isOpen && !flow.isLoading && (
          <Animated.View entering={CONTROL_FADE_IN}>
            <IconButton name="close" label={copy.dismiss} onPress={flow.close} />
          </Animated.View>
        )}
        {!isOpen && (
          <Animated.View entering={CONTROL_FADE_IN}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={summary ? copy.cached : copy.open}
              disabled={!flow.isReady}
              accessibilityState={{ disabled: !flow.isReady }}
              hitSlop={OPEN_HIT_SLOP}
              onPress={flow.open}
              style={({ pressed }) => [styles.open, pressed && styles.pressed]}
            >
              <Txt variant="caption" style={styles.white}>
                {copy.openShort}
              </Txt>
            </Pressable>
          </Animated.View>
        )}
      </View>
      <Animated.View style={[styles.bodyFrame, bodyFrameStyle]}>
        {(isOpen || isBodyMounted) && (
          <Animated.View
            style={[styles.bodyContent, bodyContentStyle]}
            onLayout={onBodyLayout}
            pointerEvents={isOpen ? 'auto' : 'none'}
          >
            {isBodyLoading ? (
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
                {summary?.status === 'ready' ? (
                  <Txt selectable>{summary.summary}</Txt>
                ) : (
                  !query.error && (
                    <View style={styles.point}>
                      <Txt variant="label">
                        {emptyStatus ? copy[`${emptyStatus}Title`] : copy.pendingTitle}
                      </Txt>
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
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: c.warmMist,
    borderRadius: mobileLayout.cardRadius,
    padding: s.md,
    marginBottom: s.sm,
  },
  bodyFrame: { overflow: 'hidden' },
  // Out of the flow, so the content keeps its real height while the frame around it is still small.
  bodyContent: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: s.md },
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
  open: {
    height: OPEN_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: c.coralInk,
    alignItems: 'center',
    justifyContent: 'center',
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
