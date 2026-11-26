import { explorer as x, nativeFonts as fonts } from '@tripflix/tokens';
import { t, vi } from '@tripflix/i18n';
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

const ACCENT = x.day.link;
const BACKGROUND = x.day.canvas;
const INK = x.day.text;
const enter = FadeInDown.duration(280).reduceMotion(ReduceMotion.System);
type InterestOption = {
  id: Interest;
  title: string;
  detail: string;
  /** Chưa có ảnh phù hợp cho mục nào thì dùng icon, không mượn ảnh của mục khác. */
  image?: typeof assets.sea;
  icon: IconName;
};
const interestOption = (
  id: Interest,
  art: { image: typeof assets.sea } | { icon: IconName },
): InterestOption => ({
  id,
  title: vi.api.travelInterestOptions[id],
  detail: vi.api.onboardingInterestDetails[id],
  icon: 'icon' in art ? art.icon : 'image-outline',
  image: 'image' in art ? art.image : undefined,
});
const interests: InterestOption[] = [
  interestOption('coast', { image: assets.sea }),
  interestOption('nature', { image: assets.vietnam }),
  interestOption('culture', { image: assets.hoiAn }),
  interestOption('food', { icon: 'restaurant-outline' }),
  interestOption('city', { icon: 'moon-outline' }),
  interestOption('stays', { image: assets.hotel }),
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

function InterestArt({ item }: { item: InterestOption }) {
  if (item.image)
    return <Image source={item.image} contentFit="cover" style={StyleSheet.absoluteFill} transition={200} />;
  return (
    <View style={[StyleSheet.absoluteFill, styles.iconArt]}>
      <Icon name={item.icon} size={44} color={INK} />
    </View>
  );
}

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
      <Icon name="arrow-forward" color={x.action.onPrimary} size={22} />
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

function TripiGuide({ message }: { message: string }) {
  return (
    <View style={styles.guide}>
      <View style={styles.guideAvatar}>
        <Image source={assets.welcome} contentFit="contain" style={styles.guideImage} />
      </View>
      <View style={styles.guideBubble}>
        <Txt style={styles.guideName}>Tripi</Txt>
        <Txt style={styles.guideText}>{message}</Txt>
      </View>
    </View>
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
  const { record, updateDraft, finish, continueOnce, storageError, accountError, isAccount } =
    useOnboarding();
  const { mode, source, returnTo } = useLocalSearchParams<{
    mode?: string;
    source?: string;
    returnTo?: string;
  }>();
  const [step, setStep] = useState<OnboardingStep>(() =>
    record.status === 'draft' ? record.step : source === 'account' ? 'interests' : 'welcome',
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
    if (source === 'signup' || source === 'account')
      router.dismissTo(resolveMobileLoginReturn(returnTo) as Href);
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
          ) : source === 'signup' || source === 'account' ? (
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
                  Chuyến đi,{'\n'}theo gu của bạn.
                </Txt>
                <Txt style={styles.slogan}>{vi.mobile.explorer.slogan}</Txt>
                <Txt style={styles.body}>
                  Chọn vài điều bạn thích.{'\n'}Bắt đầu tìm cảm hứng cho chuyến đi tiếp theo.
                </Txt>
              </View>
              <View style={styles.introNote}>
                <Icon name="time-outline" size={16} color={x.day.link} />
                <Txt style={styles.noteText}>Hai câu hỏi ngắn. Không cần tài khoản.</Txt>
              </View>
            </>
          ) : step === 'interests' ? (
            <>
              <View style={styles.stepHeading}>
                <TripiGuide message="Chọn một hoặc nhiều điều bạn thích nhé." />
                <Txt variant="title" style={styles.question}>
                  Điều gì khiến bạn{'\n'}muốn xách ba lô?
                </Txt>
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
                      style={({ pressed }) => [
                        styles.interest,
                        selected && styles.interestSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={[styles.interestPhoto, { aspectRatio: compact ? 1.22 : 1.02 }]}>
                        <InterestArt item={item} />
                        <View style={[styles.check, selected && styles.checked]}>
                          {selected && <Icon name="checkmark" size={16} color={x.brand.white} />}
                        </View>
                      </View>
                      <Txt style={styles.interestTitle}>{item.title}</Txt>
                      <Txt style={styles.interestDetail}>{item.detail}</Txt>
                    </Pressable>
                  );
                })}
              </View>
              <Txt accessibilityLiveRegion="polite" style={styles.selectionCount}>
                {chosen.length
                  ? t('api.onboardingSelectedCount', { count: chosen.length })
                  : vi.api.onboardingSelectAtLeastOne}
              </Txt>
            </>
          ) : step === 'pace' ? (
            <>
              <View style={styles.stepHeading}>
                <TripiGuide message="Bạn thường thích tận hưởng thế nào?" />
                <Txt variant="title" style={styles.question}>
                  Một chuyến đi,{'\n'}nhịp của riêng bạn.
                </Txt>
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
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Nhịp chuyến đi"
                style={styles.paceList}
              >
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
                        <Icon name={item.icon} size={22} color={ACCENT} />
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
                  Một chút về bạn.{'\n'}Nhiều điều để đi.
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
                    <InterestArt item={item} />
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
                  {isAccount ? vi.api.onboardingAccountSaveHint : vi.api.onboardingDeviceSaveHint}
                </Txt>
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        {(storageError || accountError) && (
          <View accessibilityRole="alert" style={styles.error}>
            <Txt style={styles.errorText}>
              {accountError ? vi.api.onboardingAccountSaveError : vi.api.onboardingDeviceSaveError}
              {failedFinish ? vi.api.onboardingRetrySave : ''}
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

const card = {
  backgroundColor: x.day.surface,
  borderRadius: x.radius.lg,
  shadowColor: x.shadow,
  shadowOffset: { width: 0, height: x.elevation.floating.offsetY },
  shadowRadius: x.elevation.floating.blur,
  shadowOpacity: 0.07,
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: x.gutter,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 48, height: 48, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, paddingHorizontal: x.gutter, paddingTop: x.space.md, paddingBottom: x.space.lg },
  welcomeContent: { justifyContent: 'center', paddingTop: x.space.xs },
  stage: { gap: x.space.xl },
  collage: { marginBottom: x.space.xs, marginHorizontal: -4 },
  mainPhoto: {
    position: 'absolute',
    top: 0,
    left: 2,
    bottom: 22,
    width: '68%',
    overflow: 'hidden',
    borderRadius: x.radius.xl,
    transform: [{ rotate: '-5deg' }],
  },
  smallPhoto: {
    position: 'absolute',
    width: '44%',
    height: '66%',
    right: 0,
    top: '24%',
    overflow: 'hidden',
    borderRadius: x.radius.lg,
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
    gap: x.space.xs,
    backgroundColor: x.brand.sun,
    paddingVertical: x.space.xs,
    paddingHorizontal: x.space.sm,
    borderRadius: x.radius.pill,
    transform: [{ rotate: '-3deg' }],
  },
  photoCaptionText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: INK },
  mascot: {
    position: 'absolute',
    width: 92,
    height: 100,
    top: -8,
    right: -2,
    transform: [{ rotate: '9deg' }],
  },
  mascotImage: { width: '100%', height: '100%' },
  welcomeCopy: { gap: x.space.sm },
  headline: {
    fontFamily: fonts.extraBold,
    color: INK,
    fontSize: x.type.display.fontSize,
    lineHeight: 44,
    letterSpacing: x.type.display.letterSpacing,
  },
  headlineCompact: { fontSize: 30, lineHeight: 38 },
  accent: { color: x.day.link },
  slogan: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, color: x.day.link },
  body: { color: x.day.textSecondary, fontSize: 15, lineHeight: 23 },
  introNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: x.space.xs,
    alignSelf: 'flex-start',
    paddingVertical: x.space.xs,
    paddingHorizontal: x.space.sm,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.tintExplore,
  },
  noteText: { color: x.day.link, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  action: {
    minHeight: x.control.primary,
    borderRadius: x.radius.md,
    backgroundColor: x.action.primary,
    paddingVertical: x.space.sm,
    paddingHorizontal: x.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: x.space.xs,
  },
  actionText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 24,
    color: x.action.onPrimary,
    flexShrink: 1,
  },
  actionDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  textAction: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  textActionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: x.day.textSecondary,
  },
  footer: {
    paddingTop: x.space.sm,
    paddingHorizontal: x.gutter,
    paddingBottom: x.space.xs,
    gap: 4,
    backgroundColor: BACKGROUND,
  },
  footerHint: {
    textAlign: 'center',
    color: x.day.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    paddingTop: x.space.xs,
    paddingBottom: x.space.xxs,
  },
  progressRow: {
    paddingHorizontal: x.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 26,
  },
  progressLine: { height: 6, flex: 1, borderRadius: x.radius.pill, backgroundColor: x.day.line },
  progressFilled: { backgroundColor: x.action.primary },
  stepLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: x.day.textSecondary,
    marginLeft: x.space.xs,
    minWidth: 40,
  },
  stepHeading: { gap: x.space.sm },
  guide: { flexDirection: 'row', alignItems: 'flex-end', gap: x.space.xs },
  guideAvatar: {
    width: 52,
    height: 52,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.tintWarm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  guideImage: { width: 48, height: 52 },
  guideBubble: {
    ...card,
    flex: 1,
    borderBottomLeftRadius: x.radius.sm / 2,
    paddingVertical: x.space.sm,
    paddingHorizontal: x.space.md,
  },
  guideName: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: x.day.link },
  guideText: { fontSize: 15, lineHeight: 22, color: INK },
  question: {
    fontFamily: fonts.extraBold,
    fontSize: x.type.title.fontSize,
    lineHeight: 34,
    letterSpacing: x.type.title.letterSpacing,
    color: INK,
  },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: x.space.sm, justifyContent: 'space-between' },
  interest: {
    ...card,
    width: '48%',
    padding: x.space.xs,
    gap: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  interestSelected: { borderColor: x.brand.coral, backgroundColor: x.day.tintWarm },
  interestPhoto: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: x.radius.md,
    marginBottom: x.space.xs,
  },
  iconArt: { backgroundColor: x.day.tintWarm, alignItems: 'center', justifyContent: 'center' },
  check: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 26,
    height: 26,
    borderRadius: x.radius.pill,
    borderWidth: 2,
    borderColor: x.brand.white,
    backgroundColor: x.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: x.brand.coral, borderColor: x.brand.white },
  interestTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 21,
    color: INK,
    paddingHorizontal: x.space.xxs,
  },
  interestDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: x.day.textSecondary,
    paddingHorizontal: x.space.xxs,
  },
  selectionCount: { fontSize: 13, lineHeight: 18, color: x.day.textSecondary },
  paceArt: { height: 120, overflow: 'hidden', borderRadius: x.radius.xl },
  paceArtShade: { ...StyleSheet.absoluteFill, backgroundColor: x.glass, opacity: 0.25 },
  paceMascot: { position: 'absolute', right: 12, bottom: -10, height: 122, width: 112 },
  paceList: { gap: x.space.sm },
  paceRow: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    gap: x.space.sm,
    paddingVertical: x.space.sm,
    paddingHorizontal: x.space.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paceSelected: { backgroundColor: x.day.tintWarm, borderColor: x.brand.coral },
  paceIcon: {
    width: 44,
    height: 44,
    borderRadius: x.radius.md,
    backgroundColor: x.day.tintExplore,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceCopy: { flex: 1, gap: 2 },
  paceTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: INK },
  paceDetail: { fontSize: 13, lineHeight: 18, color: x.day.textSecondary },
  radio: {
    width: 24,
    height: 24,
    borderRadius: x.radius.pill,
    borderWidth: 2,
    borderColor: x.day.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: x.brand.coral },
  radioDot: { width: 12, height: 12, borderRadius: x.radius.pill, backgroundColor: x.brand.coral },
  summaryPhotos: {
    height: 155,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: x.space.sm,
  },
  summaryPhoto: {
    width: '37%',
    height: 145,
    overflow: 'hidden',
    borderRadius: x.radius.lg,
    borderWidth: 5,
    borderColor: x.day.surface,
    marginHorizontal: -10,
  },
  summarySection: { ...card, gap: 2, padding: x.space.md },
  summaryLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  summaryLabel: { fontSize: 13, lineHeight: 18, color: x.day.textSecondary, flexShrink: 1 },
  summaryValue: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, color: INK },
  localNote: {
    flexDirection: 'row',
    gap: x.space.xs,
    alignItems: 'flex-start',
    padding: x.space.sm,
    borderRadius: x.radius.md,
    backgroundColor: x.day.tintExplore,
  },
  localNoteText: { flex: 1, fontSize: 13, lineHeight: 20, color: INK },
  error: {
    gap: 2,
    marginBottom: x.space.xs,
    padding: x.space.sm,
    borderRadius: x.radius.md,
    backgroundColor: x.day.tintWarm,
  },
  errorText: { color: x.day.error, fontSize: 13, lineHeight: 20 },
});
