import { useQuery } from '@tanstack/react-query';
import { feedApi, HttpError, usePostSearch, useUserSearch } from '@tripflix/api-client';
import type { ExploreItemDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { Chip, Icon, IconButton, money, Txt } from '@/components/mobile-ui';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { SHEET_CLOSE_SPRING, SHEET_OPEN_SPRING } from '@/components/motion';

const copy = vi.mobile.searchPanel;
const DEBOUNCE_MS = 300;
type SearchTab = 'users' | 'videos' | 'plans';
const TABS: readonly { key: SearchTab; label: string }[] = [
  { key: 'users', label: copy.users },
  { key: 'videos', label: copy.videos },
  { key: 'plans', label: copy.plans },
];

/** Khung tìm kiếm thả xuống từ thanh search, cao 2/3 màn hình, tìm người dùng, video và lộ trình. */
export function SearchDropPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelHeight = Math.round((height * 2) / 3);
  const progress = useSharedValue(0);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('videos');

  const input = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    if (!visible) return;
    progress.set(withSpring(1, SHEET_OPEN_SPRING));
    // Đợi khung bắt đầu thả xuống rồi mới mở bàn phím, để ô nhập không nhảy theo bàn phím.
    const timer = setTimeout(() => input.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [visible, progress]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const close = () =>
    progress.set(
      withSpring(0, SHEET_CLOSE_SPRING, (finished) => {
        if (finished) scheduleOnRN(onClose);
      }),
    );
  const openAndClose = (go: () => void) => {
    onClose();
    progress.set(0);
    go();
  };
  const panelStyle = useAnimatedStyle(() => ({ height: panelHeight * progress.get() }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));

  if (!visible) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={copy.close} />
      </Animated.View>
      <Animated.View
        style={[styles.panel, { width: Math.min(width, mobileLayout.contentWidth) }, panelStyle]}
        accessibilityViewIsModal
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.inputBox}>
            <Icon name="search-outline" size={mobileIconSize.control} color={colors.textMuted} />
            <TextInput
              ref={input}
              value={text}
              onChangeText={setText}
              maxLength={100}
              placeholder={copy.placeholder}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              accessibilityLabel={copy.placeholder}
              style={styles.input}
            />
            {text.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.clear}
                onPress={() => setText('')}
              >
                <Icon name="close-circle" size={mobileIconSize.control} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <IconButton name="close" size={mobileIconSize.control} label={copy.close} onPress={close} />
        </View>
        <View style={styles.tabs}>
          {TABS.map((item) => (
            <Chip key={item.key} selected={tab === item.key} onPress={() => setTab(item.key)}>
              {item.label}
            </Chip>
          ))}
        </View>
        <ScrollView
          style={styles.results}
          contentContainerStyle={styles.resultsContent}
          keyboardShouldPersistTaps="handled"
        >
          {!query ? (
            <Txt variant="small" style={styles.muted}>
              {copy.hint}
            </Txt>
          ) : tab === 'users' ? (
            <UserResults query={query} onOpenReel={(id) => openAndClose(() => openReel(id))} />
          ) : (
            <PostResults
              query={query}
              kind={tab === 'videos' ? 'video' : 'plan'}
              onOpen={(item) =>
                openAndClose(() =>
                  tab === 'videos'
                    ? openReel(item.refId)
                    : router.push({ pathname: '/trip/[slug]', params: { slug: item.refId } }),
                )
              }
            />
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function openReel(postId: string) {
  router.navigate({ pathname: '/(tabs)', params: { reel: postId } });
}

function StateText({
  isLoading,
  isError,
  isEmpty,
  query,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  query: string;
}) {
  if (isLoading) return <Txt style={styles.muted}>{copy.loading}</Txt>;
  if (isError) return <Txt style={styles.error}>{copy.error}</Txt>;
  if (isEmpty) return <Txt style={styles.muted}>{t('mobile.searchPanel.empty', { q: query })}</Txt>;
  return null;
}

function PostResults({
  query,
  kind,
  onOpen,
}: {
  query: string;
  kind: 'video' | 'plan';
  onOpen: (item: ExploreItemDto) => void;
}) {
  const search = usePostSearch({ q: query, postType: kind, limit: 20 });
  const items = search.data?.items ?? [];
  const state = (
    <StateText
      isLoading={search.isPending}
      isError={search.isError}
      isEmpty={search.isSuccess && items.length === 0}
      query={query}
    />
  );
  if (kind === 'video') {
    return (
      <>
        {state}
        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={styles.tile}
              onPress={() => onOpen(item)}
            >
              <View style={styles.tileMedia}>
                {item.thumbnail ? (
                  <Image source={item.thumbnail} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Icon name="play-circle-outline" size={mobileIconSize.reel} color={colors.background} />
                )}
                <Txt variant="caption" numberOfLines={1} style={styles.tileReason}>
                  {item.reason}
                </Txt>
              </View>
              <Txt variant="small" numberOfLines={2}>
                {item.title}
              </Txt>
            </Pressable>
          ))}
        </View>
      </>
    );
  }
  return (
    <>
      {state}
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          style={styles.plan}
          onPress={() => onOpen(item)}
        >
          <View style={styles.planMedia}>
            {item.thumbnail ? (
              <Image source={item.thumbnail} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Icon name="map-outline" size={mobileIconSize.nav} color={colors.textMuted} />
            )}
          </View>
          <View style={styles.planBody}>
            <Txt variant="label" numberOfLines={2}>
              {item.title}
            </Txt>
            {!!item.subtitle && (
              <Txt variant="caption" style={styles.muted} numberOfLines={1}>
                {item.subtitle}
              </Txt>
            )}
            <Txt variant="caption" style={styles.accent}>
              {[
                item.days ? t('mobile.searchPanel.days', { count: item.days }) : null,
                item.priceFrom
                  ? t('mobile.searchPanel.pricePerPerson', { price: money(item.priceFrom) })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Txt>
          </View>
        </Pressable>
      ))}
    </>
  );
}

function UserResults({ query, onOpenReel }: { query: string; onOpenReel: (postId: string) => void }) {
  const search = useUserSearch(query);
  const [selected, setSelected] = useState<{ id: string; displayName: string } | null>(null);
  const videos = useQuery({
    queryKey: ['feed', 'author', selected?.id],
    enabled: !!selected,
    queryFn: ({ signal }) => feedApi.listByAuthor(selected!.id, signal),
  });
  if (selected) {
    const posts = videos.data?.items ?? [];
    return (
      <>
        <Pressable accessibilityRole="button" style={styles.backRow} onPress={() => setSelected(null)}>
          <Icon name="chevron-back" size={mobileIconSize.control} />
          <Txt variant="label">{t('mobile.searchPanel.userVideos', { name: selected.displayName })}</Txt>
        </Pressable>
        <StateText
          isLoading={videos.isPending}
          isError={videos.isError}
          isEmpty={videos.isSuccess && posts.length === 0}
          query={selected.displayName}
        />
        {posts.map((post) => (
          <Pressable
            key={post.postId}
            accessibilityRole="button"
            style={styles.userRow}
            onPress={() => onOpenReel(post.postId)}
          >
            <Icon name="play-circle-outline" size={mobileIconSize.nav} color={colors.coral} />
            <View style={styles.planBody}>
              <Txt variant="label" numberOfLines={2}>
                {post.title}
              </Txt>
              <Txt variant="caption" style={styles.muted}>
                {`${post.counts.likes} ♥`}
              </Txt>
            </View>
          </Pressable>
        ))}
      </>
    );
  }
  if (!search.isSearchable) return <Txt style={styles.muted}>{copy.userQueryLength}</Txt>;
  if (search.error instanceof HttpError && search.error.status === 429) {
    return <Txt style={styles.error}>{copy.userSearchRateLimited}</Txt>;
  }
  const users = search.data?.items ?? [];
  return (
    <>
      <StateText
        isLoading={search.isPending}
        isError={search.isError}
        isEmpty={search.isSuccess && users.length === 0}
        query={query}
      />
      {users.map((user) => (
        <Pressable
          key={user.id}
          accessibilityRole="button"
          style={styles.userRow}
          onPress={() => setSelected(user)}
        >
          <View style={styles.avatar}>
            <Txt variant="label" style={styles.avatarText}>
              {user.displayName.trim().charAt(0).toUpperCase()}
            </Txt>
          </View>
          <Txt variant="label" style={styles.planBody} numberOfLines={1}>
            {user.displayName}
          </Txt>
          <Icon name="chevron-forward" size={mobileIconSize.inline} color={colors.textMuted} />
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  panel: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderBottomLeftRadius: mobileLayout.sheetRadius,
    borderBottomRightRadius: mobileLayout.sheetRadius,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: mobileLayout.touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.warmMist,
  },
  input: { flex: 1, color: colors.ink, ...compactType.body },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  results: { flex: 1 },
  resultsContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  muted: { color: colors.textMuted },
  error: { color: colors.coralInk },
  accent: { color: colors.tealInk },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '48%', gap: spacing.xs },
  tileMedia: {
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileReason: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    color: colors.background,
  },
  plan: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  planMedia: {
    width: 72,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.seaMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBody: { flex: 1, gap: spacing.xs },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: mobileLayout.touchTarget,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: mobileLayout.touchTarget,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.seaMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.tealInk },
});
