import { nativeFonts as fonts, colors } from '@tripflix/tokens';
import { resolveMobileLoginReturn } from '@tripflix/app-core';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { assets, Icon, Logo, Txt, type IconName } from '@/components/mobile-ui';
import { useOnboarding } from './onboarding-provider';
import type { Interest, OnboardingStep, Pace } from './onboarding-model';

const ACCENT = colors.coralInk;
const BACKGROUND = '#FFFDFA';
const INK = colors.navy;
const enter = FadeInDown.duration(280).reduceMotion(ReduceMotion.System);
const interests: { id: Interest; title: string; detail: string; image: typeof assets.sea }[] = [
  { id: 'coast', title: 'Biển & nắng', detail: 'Một chút mặn mòi', image: assets.sea },
  { id: 'nature', title: 'Thiên nhiên', detail: 'Ra ngoài, hít thở', image: assets.vietnam },
  { id: 'culture', title: 'Phố & văn hoá', detail: 'Đi để thấy điều mới', image: assets.hoiAn },
  { id: 'stays', title: 'Nghỉ dưỡng', detail: 'Ở đâu cũng phải thích', image: assets.hotel },
];
const paces: { id: Pace; title: string; detail: string; icon: IconName }[] = [
  {
    id: 'slow',
    title: 'Chậm một chút',
    detail: 'Ít điểm đến, nhiều thời gian tận hưởng.',
    icon: 'cafe-outline',
  },
  {
    id: 'balanced',
    title: 'Vừa đi, vừa nghỉ',
    detail: 'Có khám phá, cũng có lúc thảnh thơi.',
    icon: 'sunny-outline',
  },
  {
    id: 'active',
    title: 'Đi thật nhiều',
    detail: 'Lấp đầy ngày bằng những trải nghiệm mới.',
    icon: 'footsteps-outline',
  },
];

function Action({
  label,
  onPress,
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, disabled && styles.actionDisabled, pressed && styles.pressed]}
    >
      <Txt style={styles.actionText}>{label}</Txt>
      <Icon name="arrow-forward" color={colors.background} size={22} />
    </Pressable>
  );
}

function TextAction({
  label,
  onPress,
  style,
  disabled,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.textAction, pressed && styles.pressed, style]}
    >
      <Txt style={styles.textActionLabel}>{label}</Txt>
    </Pressable>
  );
}

export function OnboardingScreen() {
  const { ready } = useOnboarding();
  if (!ready)
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loading}>
          <Txt>Đang mở hành trình…</Txt>
        </View>
      </SafeAreaView>
    );
  return <OnboardingFlow />;
}

function OnboardingFlow() {
  const { record, updateDraft, finish, continueOnce, storageError } = useOnboarding();
  const { mode, source, returnTo } = useLocalSearchParams<{
    mode?: string;
    source?: string;
    returnTo?: string;
  }>();
  const [step, setStep] = useState<OnboardingStep>(() =>
    record.status === 'draft' ? record.step : 'welcome',
  );
  const [saving, setSaving] = useState(false);
  const [failedFinish, setFailedFinish] = useState<'skipped' | 'completed' | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 740;
  const welcome = step === 'welcome';
  const chosen = interests.filter((item) => record.interests.includes(item.id));
  const chosenPace = paces.find((item) => item.id === record.pace);

  function continueToApp() {
    if (source === 'signup') router.dismissTo(resolveMobileLoginReturn(returnTo) as Href);
    else if (mode === 'edit' && router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  function go(next: OnboardingStep) {
    setStep(next);
    setFailedFinish(null);
    updateDraft({ step: next });
    scroll.current?.scrollTo({ y: 0, animated: false });
    const heading =
      next === 'interests'
        ? 'Bạn muốn thấy gì trên chuyến đi?'
        : next === 'pace'
          ? 'Bạn thích đi theo nhịp nào?'
          : next === 'review'
            ? 'Gu đi chơi của bạn'
            : 'Chuyến đi, theo gu của bạn';
    AccessibilityInfo.announceForAccessibility(heading);
  }

  async function leave(status: 'skipped' | 'completed', login = false) {
    if (saving) return;
    setSaving(true);
    const saved = await finish(status);
    setSaving(false);
    if (!saved) {
      setFailedFinish(status);
      return;
    }
    if (login) router.replace({ pathname: '/login', params: { returnTo: '/' } });
    else continueToApp();
  }

  function back() {
    if (saving) return;
    if (step === 'welcome' && mode === 'edit') {
      if (router.canGoBack()) router.back();
      else void leave('skipped');
      return;
    }
    go(step === 'review' ? 'pace' : step === 'pace' ? 'interests' : 'welcome');
  }

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'welcome' && mode !== 'edit') return false;
      back();
      return true;
    });
    return () => subscription.remove();
  });

  const nextDisabled =
    saving || (step === 'interests' && chosen.length === 0) || (step === 'pace' && !record.pace);
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        {welcome ? (
          <Logo />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={back}
            disabled={saving}
            style={styles.back}
          >
            <Icon name="arrow-back" size={24} color={INK} />
          </Pressable>
        )}
        {welcome ? (
          mode === 'edit' ? (
            <TextAction label="Đóng" onPress={back} />
          ) : source === 'signup' ? (
            <TextAction label="Khám phá trước" onPress={() => void leave('skipped')} disabled={saving} />
          ) : (
            <TextAction label="Đăng nhập" onPress={() => void leave('skipped', true)} disabled={saving} />
          )
        ) : (
          <TextAction label="Khám phá trước" onPress={() => void leave('skipped')} disabled={saving} />
        )}
      </View>

      {!welcome && (
        <View
          style={styles.progressRow}
          accessibilityRole="progressbar"
          accessibilityLabel={
            step === 'review'
              ? 'Xem lại lựa chọn'
              : step === 'interests'
                ? 'Chọn trải nghiệm, bước 1 trên 2'
                : 'Chọn nhịp đi, bước 2 trên 2'
          }
          accessibilityValue={{ min: 0, max: 2, now: step === 'interests' ? 0 : step === 'pace' ? 1 : 2 }}
        >
          <View style={[styles.progressLine, styles.progressFilled]} />
          <View style={[styles.progressLine, step !== 'interests' && styles.progressFilled]} />
          <View style={[styles.progressLine, step === 'review' && styles.progressFilled]} />
          <Txt style={styles.stepLabel}>
            {step === 'review' ? 'Xem lại' : step === 'interests' ? '1 / 2' : '2 / 2'}
          </Txt>
        </View>
      )}

      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, welcome && styles.welcomeContent]}
      >
        <Animated.View key={step} entering={enter} style={styles.stage}>
          {welcome ? (
            <>
              <View
                style={[styles.collage, { height: compact ? 196 : 250 }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <View style={styles.mainPhoto}>
                  <Image
                    source={assets.vietnam}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
                <View style={styles.smallPhoto}>
                  <Image
                    source={assets.sea}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
                <View style={styles.photoCaption}>
                  <Txt style={styles.photoCaptionText}>Chuyến tiếp theo?</Txt>
                  <Icon name="arrow-up-right-box-outline" size={18} color={INK} />
                </View>
                <View style={styles.mascot}>
                  <Image source={assets.explore} style={styles.mascotImage} contentFit="contain" />
                </View>
              </View>
              <View style={styles.welcomeCopy}>
                <Txt variant="title" style={[styles.headline, compact && styles.headlineCompact]}>
                  Chuyến đi,{'\n'}theo{' '}
                  <Txt style={[styles.headline, styles.accent, compact && styles.headlineCompact]}>
                    gu của bạn.
                  </Txt>
                </Txt>
                <Txt style={styles.body}>
                  Chọn vài điều bạn thích.{'\n'}Bắt đầu tìm cảm hứng cho chuyến đi tiếp theo.
                </Txt>
              </View>
              <View style={styles.introNote}>
                <View style={styles.noteRule} />
                <Txt style={styles.noteText}>Hai câu hỏi ngắn. Không cần tài khoản.</Txt>
              </View>
            </>
          ) : step === 'interests' ? (
            <>
              <View style={styles.stepHeading}>
                <Txt variant="title" style={styles.question}>
                  Điều gì khiến bạn{'\n'}muốn <Txt style={[styles.question, styles.accent]}>xách ba lô?</Txt>
                </Txt>
                <Txt style={styles.body}>Chọn một hoặc nhiều điều bạn thích.</Txt>
              </View>
              <View style={styles.interestGrid}>
                {interests.map((item) => {
                  const selected = record.interests.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="checkbox"
                      aria-checked={selected}
                      accessibilityLabel={item.title}
                      accessibilityState={{ checked: selected }}
                      onPress={() =>
                        updateDraft({
                          interests: selected
                            ? record.interests.filter((id) => id !== item.id)
                            : [...record.interests, item.id],
                        })
                      }
                      style={({ pressed }) => [styles.interest, pressed && styles.pressed]}
                    >
                      <View
                        style={[
                          styles.interestPhoto,
                          { aspectRatio: compact ? 1.22 : 1.02 },
                          selected && styles.selectedPhoto,
                        ]}
                      >
                        <Image
                          source={item.image}
                          contentFit="cover"
                          style={StyleSheet.absoluteFill}
                          transition={200}
                        />
                        <View style={[styles.check, selected && styles.checked]}>
                          {selected && <Icon name="checkmark" size={18} color={colors.background} />}
                        </View>
                      </View>
                      <Txt style={[styles.interestTitle, selected && styles.accent]}>{item.title}</Txt>
                      <Txt style={styles.interestDetail}>{item.detail}</Txt>
                    </Pressable>
                  );
                })}
              </View>
              <Txt accessibilityLiveRegion="polite" style={styles.selectionCount}>
                {chosen.length
                  ? `Đã chọn ${chosen.length} trải nghiệm`
                  : 'Chọn ít nhất 1 trải nghiệm để tiếp tục.'}
              </Txt>
            </>
          ) : step === 'pace' ? (
            <>
              <View style={styles.stepHeading}>
                <Txt variant="title" style={styles.question}>
                  Một chuyến đi,{'\n'}
                  <Txt style={[styles.question, styles.accent]}>nhịp của riêng bạn.</Txt>
                </Txt>
                <Txt style={styles.body}>Bạn thường thích tận hưởng thế nào?</Txt>
              </View>
              <View
                style={styles.paceArt}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Image source={assets.beach} contentFit="cover" style={StyleSheet.absoluteFill} />
                <View style={styles.paceArtShade} />
                <Image source={assets.explore} contentFit="contain" style={styles.paceMascot} />
              </View>
              <View accessibilityRole="radiogroup" accessibilityLabel="Nhịp chuyến đi">
                {paces.map((item) => {
                  const selected = record.pace === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="radio"
                      aria-checked={selected}
                      accessibilityLabel={item.title}
                      accessibilityHint={item.detail}
                      accessibilityState={{ checked: selected }}
                      onPress={() => updateDraft({ pace: item.id })}
                      style={({ pressed }) => [
                        styles.paceRow,
                        selected && styles.paceSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.paceIcon}>
                        <Icon name={item.icon} size={24} color={selected ? ACCENT : INK} />
                      </View>
                      <View style={styles.paceCopy}>
                        <Txt style={styles.paceTitle}>{item.title}</Txt>
                        <Txt style={styles.paceDetail}>{item.detail}</Txt>
                      </View>
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <View style={styles.stepHeading}>
                <Txt variant="title" style={styles.question}>
                  Một chút về bạn.{'\n'}
                  <Txt style={[styles.question, styles.accent]}>Nhiều điều để đi.</Txt>
                </Txt>
                <Txt style={styles.body}>Đây là gu chuyến đi bạn vừa chọn.</Txt>
              </View>
              <View
                style={styles.summaryPhotos}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {(chosen.length ? chosen : interests.slice(0, 1)).slice(0, 3).map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.summaryPhoto,
                      { transform: [{ rotate: `${(index - 1) * 5}deg` }], zIndex: 3 - index },
                    ]}
                  >
                    <Image source={item.image} contentFit="cover" style={StyleSheet.absoluteFill} />
                  </View>
                ))}
              </View>
              <View style={styles.summarySection}>
                <View style={styles.summaryLabelRow}>
                  <Txt style={styles.summaryLabel}>Trải nghiệm yêu thích</Txt>
                  <TextAction label="Sửa trải nghiệm" onPress={() => go('interests')} />
                </View>
                <Txt style={styles.summaryValue}>
                  {chosen.map((item) => item.title).join(' · ') || 'Chưa chọn'}
                </Txt>
              </View>
              <View style={styles.summarySection}>
                <View style={styles.summaryLabelRow}>
                  <Txt style={styles.summaryLabel}>Nhịp chuyến đi</Txt>
                  <TextAction label="Sửa nhịp đi" onPress={() => go('pace')} />
                </View>
                <Txt style={styles.summaryValue}>{chosenPace?.title ?? 'Chưa chọn'}</Txt>
              </View>
              <View style={styles.localNote}>
                <Icon name="bookmark-outline" size={20} color={INK} />
                <Txt style={styles.localNoteText}>
                  Gu được lưu trên thiết bị này. Bạn có thể mở lại ở Hồ sơ → Gu du lịch.
                </Txt>
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        {storageError && (
          <View accessibilityRole="alert" style={styles.error}>
            <Txt style={styles.errorText}>
              Chưa lưu được trên thiết bị. Lựa chọn vẫn còn trong phiên này.
              {failedFinish ? ' Bấm lại để thử lưu.' : ''}
            </Txt>
            {failedFinish && (
              <TextAction
                label="Khám phá lần này"
                onPress={() => {
                  continueOnce();
                  continueToApp();
                }}
              />
            )}
          </View>
        )}
        <Action
          label={
            saving
              ? 'Đang lưu…'
              : step === 'review'
                ? 'Lưu và khám phá'
                : welcome
                  ? 'Chọn gu của tôi'
                  : step === 'interests'
                    ? 'Chọn nhịp chuyến đi'
                    : 'Xem gu của tôi'
          }
          busy={saving}
          disabled={nextDisabled}
          onPress={() => {
            if (step === 'review') void leave('completed');
            else go(welcome ? 'interests' : step === 'interests' ? 'pace' : 'review');
          }}
        />
        {welcome ? (
          <TextAction label="Khám phá trước" onPress={() => void leave('skipped')} disabled={saving} />
        ) : (
          <Txt style={[styles.footerHint, fontScale > 1.3 && { fontSize: 13 }]}>
            {step === 'review'
              ? 'Sở thích có thể thay đổi. Chuyến đi cũng vậy.'
              : 'Không cần chọn thật chuẩn. Bạn có thể đổi sau.'}
          </Txt>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 24,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 48, height: 48, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },
  welcomeContent: { justifyContent: 'center', paddingTop: 8 },
  stage: { gap: 24 },
  collage: { marginBottom: 8, marginHorizontal: -4 },
  mainPhoto: {
    position: 'absolute',
    top: 0,
    left: 2,
    bottom: 22,
    width: '68%',
    overflow: 'hidden',
    transform: [{ rotate: '-5deg' }],
  },
  smallPhoto: {
    position: 'absolute',
    width: '44%',
    height: '66%',
    right: 0,
    top: '24%',
    borderWidth: 5,
    borderColor: BACKGROUND,
    transform: [{ rotate: '8deg' }],
  },
  photoCaption: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.sun,
    padding: 9,
    transform: [{ rotate: '-3deg' }],
  },
  photoCaptionText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: INK },
  mascot: {
    position: 'absolute',
    width: 92,
    height: 100,
    top: -8,
    right: -2,
    transform: [{ rotate: '9deg' }],
  },
  mascotImage: { width: '100%', height: '100%' },
  welcomeCopy: { gap: 14 },
  headline: { fontFamily: fonts.extraBold, color: INK, fontSize: 36, lineHeight: 47, letterSpacing: -1.5 },
  headlineCompact: { fontSize: 32, lineHeight: 42 },
  accent: { color: ACCENT },
  body: { color: '#53606B', fontSize: 14, lineHeight: 23 },
  introNote: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteRule: { width: 22, height: 2, backgroundColor: ACCENT },
  noteText: { flex: 1, color: '#53606B', fontSize: 12, lineHeight: 20 },
  action: {
    minHeight: 56,
    borderRadius: 4,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.background,
    flexShrink: 1,
  },
  actionDisabled: { backgroundColor: '#D8D5D0' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  textAction: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  textActionLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 20,
    color: INK,
    textDecorationLine: 'underline',
  },
  footer: { paddingTop: 12, paddingHorizontal: 24, paddingBottom: 8, gap: 4, backgroundColor: BACKGROUND },
  footerHint: {
    textAlign: 'center',
    color: '#626974',
    fontSize: 11,
    lineHeight: 18,
    paddingTop: 9,
    paddingBottom: 7,
  },
  progressRow: { paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 26 },
  progressLine: { height: 2, flex: 1, backgroundColor: '#E4E0DB' },
  progressFilled: { backgroundColor: ACCENT },
  stepLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 18,
    color: '#53606B',
    marginLeft: 10,
    minWidth: 37,
  },
  stepHeading: { gap: 10 },
  question: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 38, letterSpacing: -1, color: INK },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'space-between' },
  interest: { width: '47%', gap: 4 },
  interestPhoto: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  selectedPhoto: { borderColor: ACCENT },
  check: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 25,
    height: 25,
    borderWidth: 1.5,
    borderColor: colors.background,
    backgroundColor: '#141B3D66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: ACCENT, borderColor: ACCENT },
  interestTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 22, color: INK },
  interestDetail: { fontSize: 11, lineHeight: 18, color: '#626974' },
  selectionCount: { fontSize: 12, lineHeight: 20, color: '#53606B' },
  paceArt: { height: 110, overflow: 'hidden' },
  paceArtShade: { ...StyleSheet.absoluteFill, backgroundColor: '#141B3D12' },
  paceMascot: { position: 'absolute', right: 12, bottom: -10, height: 122, width: 112 },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 92,
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E0DB',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  paceSelected: { backgroundColor: '#FFF0EB', borderLeftColor: ACCENT },
  paceIcon: { width: 32, alignItems: 'center' },
  paceCopy: { flex: 1, gap: 4 },
  paceTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 24, color: INK },
  paceDetail: { fontSize: 12, lineHeight: 20, color: '#53606B' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#8B8B8B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: ACCENT },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT },
  summaryPhotos: {
    height: 155,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  summaryPhoto: {
    width: '37%',
    height: 145,
    borderWidth: 5,
    borderColor: colors.background,
    marginHorizontal: -10,
  },
  summarySection: { gap: 0, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E4E0DB' },
  summaryLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  summaryLabel: { fontSize: 12, lineHeight: 20, color: '#53606B', flexShrink: 1 },
  summaryValue: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 28, color: INK },
  localNote: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  localNoteText: { flex: 1, fontSize: 12, lineHeight: 21, color: '#53606B' },
  error: {
    gap: 2,
    marginBottom: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    backgroundColor: '#FFF0EB',
  },
  errorText: { color: ACCENT, fontSize: 12, lineHeight: 20 },
});
