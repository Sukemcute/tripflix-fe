import type { HomeDestinationPickDto } from '@tripflix/api-client/core-api/model/index';
import { explorer as x, nativeFonts as fonts } from '@tripflix/tokens';
import { vi } from '@tripflix/i18n';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { assets, Icon, Logo, money, Txt } from '@/components/mobile-ui';
import { NotificationBell } from '@/features/account/notification-bell';
import { SearchDropPanel } from './search-drop-panel';

export type ExploreCategory = 'all' | 'sea' | 'weekend';
const ACCENT = x.day.link;
const BACKGROUND = x.day.canvas;
const enter = FadeInDown.duration(280).reduceMotion(ReduceMotion.System);
const copy = vi.mobile.explore;
const categories: { id: ExploreCategory; label: string }[] = [
  { id: 'all', label: vi.mobile.notifications.all },
  { id: 'sea', label: copy.sea },
  { id: 'weekend', label: copy.weekend },
];
const openSearch = (q?: string) => router.push({ pathname: '/search', params: q ? { q } : {} });

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.textLink, pressed && styles.pressed]}
    >
      <Txt style={styles.linkText}>{label}</Txt>
      <Icon name="arrow-forward" size={18} color={ACCENT} />
    </Pressable>
  );
}

export function ExploreHome({
  category,
  onCategoryChange,
  searchOpen,
  onSearchOpen,
  onSearchClose,
  children,
}: PropsWithChildren<{
  category: ExploreCategory;
  onCategoryChange: (category: ExploreCategory) => void;
  searchOpen: boolean;
  onSearchOpen: () => void;
  onSearchClose: () => void;
}>) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <SearchDropPanel visible={searchOpen} onClose={onSearchClose} />
      <View style={styles.header}>
        <Logo />
        <NotificationBell />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View entering={enter} style={styles.opening}>
          <Txt variant="title" style={styles.title}>
            {vi.mobile.explorer.title}
          </Txt>
          <Txt style={styles.slogan}>{vi.mobile.explorer.slogan}</Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={vi.mobile.searchPanel.placeholder}
            onPress={onSearchOpen}
            style={({ pressed }) => [styles.search, pressed && styles.pressed]}
          >
            <Icon name="search-outline" size={22} color={x.day.text} />
            <Txt style={styles.searchText}>{vi.mobile.searchPanel.placeholder}</Txt>
          </Pressable>
          <View style={styles.services}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tìm khách sạn"
              onPress={() => router.push({ pathname: '/search', params: { autoFocus: '1' } })}
              style={({ pressed }) => [styles.service, pressed && styles.pressed]}
            >
              <Icon name="bed-outline" size={23} color={x.day.text} />
              <View style={styles.serviceCopy}>
                <Txt style={styles.serviceText}>Khách sạn</Txt>
                <Txt style={styles.serviceHint}>{vi.mobile.explorer.stayHint}</Txt>
              </View>
              <Icon name="arrow-up-right-box-outline" size={16} color={ACCENT} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/flights')}
              style={({ pressed }) => [styles.service, pressed && styles.pressed]}
            >
              <Icon name="airplane-outline" size={23} color={x.day.text} />
              <View style={styles.serviceCopy}>
                <Txt style={styles.serviceText}>{vi.flights.title}</Txt>
                <Txt style={styles.serviceHint}>{vi.mobile.explorer.flightHint}</Txt>
              </View>
              <Icon name="arrow-up-right-box-outline" size={16} color={ACCENT} />
            </Pressable>
          </View>
        </Animated.View>

        <View accessibilityRole="tablist" accessibilityLabel="Chủ đề khám phá" style={styles.filters}>
          {categories.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: category === item.id }}
              aria-selected={category === item.id}
              onPress={() => onCategoryChange(item.id)}
              style={({ pressed }) => [
                styles.filter,
                category === item.id && styles.filterSelected,
                pressed && styles.pressed,
              ]}
            >
              <Txt style={[styles.filterLabel, category === item.id && styles.accent]}>{item.label}</Txt>
            </Pressable>
          ))}
        </View>
        <ExploreHighlights category={category} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={vi.mobile.explorer.assistantAction}
          onPress={() => router.push('/assistant')}
          style={({ pressed }) => [styles.assistant, pressed && styles.pressed]}
        >
          <Image source={assets.curious} contentFit="contain" style={styles.assistantMascot} />
          <View style={styles.assistantCopy}>
            <Txt style={styles.assistantTitle}>{vi.mobile.explorer.assistantTitle}</Txt>
            <Txt style={styles.secondary}>{vi.mobile.explorer.assistantBody}</Txt>
            <Txt style={styles.assistantAction}>{vi.mobile.explorer.assistantAction}</Txt>
          </View>
        </Pressable>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function ExploreHighlights({ category }: { category: ExploreCategory }) {
  const isWeekend = category === 'weekend';
  const destinations = [
    { name: copy.nhaTrang, image: assets.beach },
    category === 'sea'
      ? { name: copy.haLong, image: assets.vietnam }
      : { name: copy.hoiAn, image: assets.hoiAn },
  ];
  const featured = destinations[isWeekend ? 1 : 0]!;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Khám phá ${featured.name}`}
        onPress={() => openSearch(featured.name)}
        style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
      >
        <Image source={featured.image} contentFit="cover" style={StyleSheet.absoluteFill} />
        <LinearGradient colors={x.scrim} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroContent}>
          <Txt style={styles.heroPlace}>{featured.name}</Txt>
          <Txt style={styles.editorial}>{vi.mobile.explorer.editorial}</Txt>
          <View style={styles.heroBottom}>
            <Txt variant="heading" style={styles.heroTitle}>
              {isWeekend ? copy.weekendHero : copy.beachHero}
            </Txt>
            <View style={styles.heroArrow}>
              <Icon name="arrow-forward" size={22} color={x.brand.white} />
            </View>
          </View>
        </View>
      </Pressable>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Txt variant="heading" style={styles.sectionTitle}>
            {isWeekend ? copy.weekendTitle : category === 'sea' ? copy.beachTitle : 'Điểm đến gợi ý'}
          </Txt>
          <TextLink label={vi.mobile.common.viewAll} onPress={() => openSearch()} />
        </View>
        <View style={styles.destinations}>
          {(isWeekend ? [...destinations].reverse() : destinations).map((destination) => (
            <Pressable
              key={destination.name}
              accessibilityRole="button"
              accessibilityLabel={`Tìm chuyến đi ${destination.name}`}
              onPress={() => openSearch(destination.name)}
              style={({ pressed }) => [styles.destination, pressed && styles.pressed]}
            >
              <Image source={destination.image} contentFit="cover" style={styles.destinationImage} />
              <View style={styles.destinationLabel}>
                <Txt style={styles.destinationName}>{destination.name}</Txt>
                <Icon name="arrow-forward" size={17} color={ACCENT} />
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );
}

export function ExploreStaysHeading() {
  return (
    <View style={styles.staysHeading}>
      <Txt variant="heading" style={styles.sectionTitle}>
        Một nơi để dừng chân
      </Txt>
      <Txt style={styles.secondary}>Gợi ý nơi ở cho chuyến đi tiếp theo.</Txt>
    </View>
  );
}

export function ExploreStayCard({ destination }: { destination: HomeDestinationPickDto }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const stay = destination.hotels[0];
  if (!stay) return null;
  const open = () => router.push({ pathname: '/hotel/[id]', params: { id: stay.hotelId } });
  return (
    <View style={styles.stay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={stay.name}
        onPress={open}
        style={({ pressed }) => [styles.stayMain, pressed && styles.pressed]}
      >
        <View style={styles.stayPhoto}>
          {stay.thumbnail && stay.thumbnail !== failedUrl ? (
            <Image
              source={stay.thumbnail}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
              onError={() => setFailedUrl(stay.thumbnail)}
            />
          ) : (
            <View style={styles.noPhoto}>
              <Icon name="bed-outline" size={26} color={x.day.textSecondary} />
              <Txt style={styles.photoLabel}>Chưa có ảnh</Txt>
            </View>
          )}
        </View>
        <View style={styles.stayCopy}>
          <Txt style={styles.secondary}>
            {destination.province.name}
            {stay.stars ? ` · ${stay.stars} ★` : ''}
          </Txt>
          <Txt variant="heading" style={styles.stayName}>
            {stay.name}
          </Txt>
          <View style={styles.priceRow}>
            <Txt style={styles.price}>{money(stay.priceFrom)}</Txt>
            <Txt style={styles.secondary}> / đêm</Txt>
          </View>
          <Txt style={styles.priceNote}>Giá từ · 1 phòng</Txt>
        </View>
      </Pressable>
      <View style={styles.reason}>
        <Icon name="sparkles-outline" size={16} color={ACCENT} />
        <Txt style={styles.reasonText}>{stay.reason.text}</Txt>
      </View>
      <View style={styles.stayFooter}>
        {destination.otherDealsCount > 0 ? (
          <TextLink
            label={`Thêm ${destination.otherDealsCount} deal hời`}
            onPress={() => openSearch(destination.province.name)}
          />
        ) : (
          <View />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${vi.hotel.viewRooms}: ${stay.name}`}
          onPress={open}
          style={({ pressed }) => [styles.roomButton, pressed && styles.pressed]}
        >
          <Txt style={styles.roomButtonText}>{vi.hotel.viewRooms}</Txt>
          <Icon name="arrow-forward" color={x.brand.white} size={19} />
        </Pressable>
      </View>
    </View>
  );
}

export function ExploreStaysLoading() {
  return (
    <View accessibilityLabel={vi.api.loading} accessibilityRole="progressbar" style={styles.skeleton}>
      <View style={styles.skeletonPhoto} />
      <View style={styles.skeletonCopy}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '90%' }]} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
    </View>
  );
}

export function ExploreStaysNotice({
  message,
  retry,
  busy,
}: {
  message: string;
  retry?: () => void;
  busy?: boolean;
}) {
  return (
    <View style={styles.notice}>
      <Txt accessibilityRole={retry ? 'alert' : undefined} style={styles.noticeText}>
        {message}
      </Txt>
      {retry && (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          accessibilityState={{ disabled: !!busy }}
          onPress={retry}
          style={styles.retry}
        >
          <Txt style={styles.linkText}>{busy ? vi.api.loading : vi.api.retry}</Txt>
          <Icon name="refresh-outline" size={18} color={ACCENT} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    minHeight: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: x.gutter,
    paddingTop: 12,
    paddingBottom: 32,
    gap: x.space.xl,
  },
  opening: { gap: 12 },
  slogan: { fontSize: 14, lineHeight: 22, color: x.day.textSecondary },
  serviceCopy: { flex: 1, gap: 2 },
  serviceHint: { fontSize: 11, lineHeight: 16, color: x.day.textSecondary },
  assistant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: x.radius.lg,
    backgroundColor: x.day.tintExplore,
  },
  assistantMascot: { width: 68, height: 84 },
  assistantCopy: { flex: 1, gap: 6 },
  assistantTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, color: x.day.text },
  assistantAction: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 22, color: x.day.link },
  editorial: { fontSize: 10, lineHeight: 16, color: x.day.surface },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 30,
    lineHeight: 42,
    letterSpacing: -1.2,
    color: x.day.text,
  },
  accent: { color: ACCENT },
  search: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: x.radius.md,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchText: { fontSize: 13, lineHeight: 21, color: x.day.textSecondary, flex: 1 },
  services: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  service: {
    flex: 1,
    minHeight: 88,
    padding: 12,
    backgroundColor: x.day.surface,
    borderRadius: x.radius.lg,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 22,
    color: x.day.text,
    flexShrink: 1,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  filter: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.surface,
    justifyContent: 'center',
  },
  filterSelected: { backgroundColor: x.day.tintExplore },
  filterLabel: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 22, color: x.day.textSecondary },
  hero: { borderRadius: x.radius.xl, height: 270, overflow: 'hidden', backgroundColor: x.day.text },
  heroContent: { flex: 1, justifyContent: 'flex-end', padding: 18, gap: 6 },
  heroPlace: { color: x.brand.white, fontFamily: fonts.medium, fontSize: 13, lineHeight: 22 },
  heroBottom: { flexDirection: 'row', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between' },
  heroTitle: {
    fontSize: 25,
    lineHeight: 34,
    letterSpacing: -0.6,
    fontFamily: fonts.bold,
    color: x.brand.white,
    flex: 1,
  },
  heroArrow: {
    width: 44,
    height: 44,
    borderRadius: x.radius.pill,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 29,
    fontFamily: fonts.bold,
    letterSpacing: -0.5,
    color: x.day.text,
    flexShrink: 1,
  },
  textLink: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center', paddingVertical: 8 },
  linkText: { color: ACCENT, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 20, flexShrink: 1 },
  destinations: { flexDirection: 'row', gap: 14 },
  destination: { flex: 1, minWidth: 0, gap: 8 },
  destinationImage: {
    borderRadius: x.radius.lg,
    width: '100%',
    aspectRatio: 1.15,
    backgroundColor: x.day.tintExplore,
  },
  destinationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: 30,
  },
  destinationName: { fontFamily: fonts.semibold, color: x.day.text, fontSize: 14, lineHeight: 23, flex: 1 },
  staysHeading: { gap: 4, marginTop: 8 },
  secondary: { color: x.day.textSecondary, fontSize: 13, lineHeight: 21 },
  stay: { gap: 16, padding: 16, borderRadius: x.radius.lg, backgroundColor: x.day.surface },
  stayMain: { gap: 16 },
  stayPhoto: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: x.radius.md,
    overflow: 'hidden',
    backgroundColor: x.day.tintExplore,
  },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 },
  photoLabel: { color: x.day.textSecondary, textAlign: 'center', fontSize: 11, lineHeight: 17 },
  stayCopy: { flex: 1, gap: 5 },
  stayName: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 25, color: x.day.text },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 4 },
  price: { fontSize: 20, lineHeight: 29, fontFamily: fonts.bold, color: x.day.price },
  priceNote: { color: x.day.textSecondary, fontSize: 12, lineHeight: 19 },
  reason: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  reasonText: { flex: 1, color: x.day.textSecondary, fontSize: 13, lineHeight: 22 },
  stayFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: x.radius.md,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomButtonText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: fonts.semibold,
    color: x.brand.white,
    flexShrink: 1,
  },
  skeleton: { flexDirection: 'row', gap: 14, paddingBottom: 22 },
  skeletonPhoto: { width: 92, height: 132, backgroundColor: x.day.line },
  skeletonCopy: { flex: 1, paddingTop: 8, gap: 15 },
  skeletonLine: { height: 16, width: '40%', backgroundColor: x.day.line },
  notice: { padding: x.space.md, borderRadius: x.radius.md, backgroundColor: x.day.surface, gap: 4 },
  noticeText: { color: x.day.textSecondary, fontSize: 14, lineHeight: 23 },
  retry: { flexDirection: 'row', alignSelf: 'flex-start', minHeight: 44, alignItems: 'center', gap: 8 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
});
