import { usePostSummary } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors as c, mobileLayout, nativeFonts, radius, spacing as s } from '@tripflix/tokens';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Mascot, Notice, Txt } from '@/components/mobile-ui';
import { CHROME_FADE, SHEET_CLOSE_SPRING, SHEET_OPEN_SPRING } from '@/components/motion';

const copy = vi.summary;
const TOGGLE_HEIGHT = 32;
const TOGGLE_HIT_SLOP = (mobileLayout.touchTarget - TOGGLE_HEIGHT) / 2;
const SUMMARY_FADE_IN = FadeIn.duration(CHROME_FADE.duration).reduceMotion(ReduceMotion.System);
/** Nhãn mục mà tripflix-ai ghép vào một chuỗi: "Khen: …. Chê: …. Khác video: …." */
const SECTION_START = /(?:^|\s)(Khen|Chê|Khác video):\s*/g;

/** Chữ hiện dần từng từ như Tripi đang viết; đoạn dài vẫn xong trong STREAM_MAX_MS. */
const STREAM_TICK_MS = 40;
const STREAM_MS_PER_WORD = 35;
const STREAM_MAX_MS = 2200;

export type SummarySection = { label: string | null; text: string };

/** Tách chuỗi tóm tắt thành từng mục để mỗi mục một dòng; chuỗi không có nhãn giữ nguyên. */
export function splitSummarySections(summary: string): SummarySection[] {
  const starts = [...summary.matchAll(SECTION_START)];
  if (starts.length === 0) return [{ label: null, text: summary.trim() }];
  const sections: SummarySection[] = [];
  const lead = summary.slice(0, starts[0]!.index).trim();
  if (lead) sections.push({ label: null, text: lead });
  starts.forEach((match, i) => {
    const end = starts[i + 1]?.index ?? summary.length;
    const text = summary.slice(match.index + match[0].length, end).trim();
    if (text) sections.push({ label: match[1]!, text });
  });
  return sections;
}

/** Vị trí ngay sau mỗi từ, đếm nối tiếp qua các mục, để hiện dần theo từ thay vì cắt giữa chữ. */
export function findWordEnds(sections: SummarySection[]): number[] {
  const ends: number[] = [];
  let offset = 0;
  for (const section of sections) {
    for (const word of section.text.matchAll(/\S+/g)) ends.push(offset + word.index + word[0].length);
    offset += section.text.length;
  }
  return ends;
}

/** Số ký tự đang hiện (null là hiện hết). start() chạy lại từ đầu, trừ khi người dùng bật Reduce Motion. */
function useWordStream(wordEnds: number[]) {
  const isReduceMotion = useReducedMotion();
  const [shownWords, setShownWords] = useState<number | null>(null);
  const wordCount = wordEnds.length;
  useEffect(() => {
    if (shownWords === null || shownWords >= wordCount) return;
    const ticks = Math.max(1, Math.round(Math.min(wordCount * STREAM_MS_PER_WORD, STREAM_MAX_MS) / STREAM_TICK_MS));
    const wordsPerTick = Math.ceil(wordCount / ticks);
    const timer = setTimeout(
      () => setShownWords((shown) => (shown === null ? null : Math.min(wordCount, shown + wordsPerTick))),
      STREAM_TICK_MS,
    );
    return () => clearTimeout(timer);
  }, [shownWords, wordCount]);
  const start = () => {
    if (!isReduceMotion && wordCount > 1) setShownWords(0);
  };
  const visibleChars = shownWords === null || shownWords >= wordCount ? null : (wordEnds[shownWords - 1] ?? 0);
  return { visibleChars, start };
}

/**
 * Tóm tắt bình luận ở đầu bình luận reel. Tải sẵn; bài chưa có tóm tắt (đang tải,
 * chưa đủ bình luận, lỗi) thì không hiện gì. Nút "Tóm tắt" đỏ ẩn hoặc hiện phần nội dung.
 * Khung nội dung đổi chiều cao thật từng khung hình, nên bình luận bên dưới trượt theo
 * thay vì nhảy chỗ rồi bị khối tóm tắt đè lên. Lần mở đầu tiên chữ hiện dần từng từ,
 * khung cao dần theo chữ; mở lại thì hiện đủ ngay.
 */
export function CommunitySummary({ postId }: { postId: string }) {
  const { data: summary } = usePostSummary(postId, { autoLoad: true });
  const [isOpen, setOpen] = useState(false);
  const bodyHeight = useSharedValue(0);
  const bodyOpacity = useSharedValue(0);
  const measuredHeight = useRef(0);
  const hasStreamed = useRef(false);
  const sections = useMemo(() => (summary?.summary ? splitSummarySections(summary.summary) : []), [summary?.summary]);
  const wordEnds = useMemo(() => findWordEnds(sections), [sections]);
  const { visibleChars, start: startStream } = useWordStream(wordEnds);
  useEffect(() => {
    bodyOpacity.set(withTiming(isOpen ? 1 : 0, CHROME_FADE));
    bodyHeight.set(
      isOpen ? withSpring(measuredHeight.current, SHEET_OPEN_SPRING) : withSpring(0, SHEET_CLOSE_SPRING),
    );
  }, [isOpen, bodyHeight, bodyOpacity]);
  const onBodyLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height === measuredHeight.current) return;
    measuredHeight.current = height;
    // Nội dung đổi (bản tóm tắt mới) khi đang mở thì khung theo kịp ngay.
    if (isOpen) bodyHeight.set(withSpring(height, SHEET_OPEN_SPRING));
  };
  const toggle = () => {
    if (!isOpen && !hasStreamed.current) {
      hasStreamed.current = true;
      // Khung mở từ chiều cao của phần chữ đầu tiên rồi cao dần theo chữ, không bung hết rồi mới hiện chữ.
      measuredHeight.current = 0;
      startStream();
    }
    setOpen((open) => !open);
  };
  const frameStyle = useAnimatedStyle(() => ({ height: bodyHeight.get() }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: bodyOpacity.get() }));
  if (summary?.status !== 'ready' || !summary.summary) return null;
  return (
    <Animated.View entering={SUMMARY_FADE_IN} style={styles.root} testID="community-summary">
      <View style={styles.header}>
        <Mascot pose="celebrate" size={30} />
        <View style={styles.heading}>
          <View style={styles.sectionHeading}>
            <Txt variant="label" style={styles.title}>{copy.resultTitle}</Txt>
            <Txt style={styles.ai}>{copy.badge}</Txt>
          </View>
          <Txt variant="caption" style={styles.basedOn}>
            {t('summary.basedOn', { count: summary.commentCount })}
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isOpen ? copy.dismiss : copy.open}
          accessibilityState={{ expanded: isOpen }}
          hitSlop={TOGGLE_HIT_SLOP}
          onPress={toggle}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
          testID="community-summary-toggle"
        >
          <Txt variant="caption" style={styles.toggleText}>
            {isOpen ? copy.close : copy.openShort}
          </Txt>
        </Pressable>
      </View>
      <Animated.View style={[styles.frame, frameStyle]}>
        <Animated.View
          style={[styles.content, contentStyle]}
          onLayout={onBodyLayout}
          pointerEvents={isOpen ? 'auto' : 'none'}
          accessibilityElementsHidden={!isOpen}
          importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
        >
          {summary.hasSafetyWarnings && (
            <View testID="summary-safety">
              <Notice tone="warning">
                <Txt variant="label" style={styles.title}>{copy.safetyTitle}</Txt>
                {'\n'}
                {copy.safety}
              </Notice>
            </View>
          )}
          {sections.map((section, i) => {
            const sectionStart = findSectionStart(sections, i);
            const shown = visibleChars === null ? section.text : section.text.slice(0, Math.max(0, visibleChars - sectionStart));
            if (!shown) return null;
            return (
              <Txt key={i} variant="small" style={styles.body} selectable>
                {section.label && <Txt variant="small" style={[styles.body, styles.label]}>{section.label}: </Txt>}
                {shown}
              </Txt>
            );
          })}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/** Vị trí ký tự đầu của mục thứ `index` khi nối các mục lại, cùng cách đếm với findWordEnds. */
function findSectionStart(sections: SummarySection[], index: number): number {
  return sections.slice(0, index).reduce((sum, section) => sum + section.text.length, 0);
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: c.warmMist,
    borderRadius: mobileLayout.cardRadius,
    padding: s.sm,
    marginBottom: s.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
  heading: { flex: 1 },
  title: { fontSize: 14, lineHeight: 19 },
  basedOn: { color: c.textMuted, fontSize: 12, lineHeight: 17 },
  frame: { overflow: 'hidden' },
  // Nằm ngoài dòng chảy, nên luôn đo được chiều cao thật dù khung đang thu về 0.
  content: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: s.sm, gap: s.xs },
  body: { fontSize: 15, lineHeight: 22 },
  label: { fontFamily: nativeFonts.semibold },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: s.sm },
  ai: {
    color: c.tealInk,
    backgroundColor: c.seaMist,
    fontSize: 11,
    lineHeight: 17,
    borderRadius: radius.sm,
    paddingHorizontal: s.xs,
    overflow: 'hidden',
  },
  toggle: {
    height: TOGGLE_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: c.coralInk,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s.md,
  },
  toggleText: { color: c.background, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.75 },
});
