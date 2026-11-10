import * as Linking from 'expo-linking';
import {
  useApiSession,
  usePostSearch,
  type ExploreItemDto,
  type ExploreUnderstoodDto,
  type SearchPostsRequestDtoPostType,
} from '@tripflix/api-client';
import { homeRecommendationsControllerRecommendForHome } from '@tripflix/api-client/core-api/discovery/discovery';
import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  assets,
  Badge,
  Button,
  Card,
  Chip,
  copy,
  Empty,
  Icon,
  IconButton,
  Mascot,
  money,
  Notice,
  Row,
  Screen,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { ApiErrorNotice, UnavailableScreen } from '@/components/api-state';
import { LiveFeedScreen } from '@/features/feed/live-feed-screen';
import { HotelSearchResults } from './hotel-search-results';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

const RECOMMENDATION_LIMIT = 3;

function relaxBudgetQuery(query: string, place?: string | null): string {
  const cleaned = query
    .replace(/(dưới|tầm|khoảng|<|<=)?\s*\d+([.,]\d+)?\s*(tr|triệu|k|nghìn|ngàn|vnd|đ)/gi, '')
    .replace(/ngân sách/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || place || query;
}

function relaxDaysQuery(query: string, place?: string | null): string {
  const cleaned = query
    .replace(/\d+\s*n\s*\d+\s*đ/gi, '')
    .replace(/\d+\s*(ngày|đêm)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || place || query;
}

function UnderstoodChips({
  understood,
  onRemoveBudget,
  onRemoveDays,
}: {
  understood: ExploreUnderstoodDto;
  onRemoveBudget?: () => void;
  onRemoveDays?: () => void;
}) {
  const chips: { label: string; onRemove?: () => void }[] = [];
  if (understood.place) {
    chips.push({ label: `📍 ${understood.place}` });
  }
  if (understood.budget) {
    chips.push({
      label: `≤ ${money(understood.budget)} / người`,
      onRemove: onRemoveBudget,
    });
  }
  if (understood.days) {
    chips.push({
      label: `${understood.days} ngày`,
      onRemove: onRemoveDays,
    });
  }
  for (const [from, to] of Object.entries(understood.fixed ?? {})) {
    chips.push({ label: `"${from}" → "${to}"` });
  }
  for (const name of understood.names ?? []) {
    chips.push({ label: name });
  }

  if (chips.length === 0) return null;

  return (
    <View style={{ gap: spacing.xs }}>
      <Txt variant="caption" style={ui.muted}>
        {vi.api.exploreUnderstood}:
      </Txt>
      <Row style={styles.categories}>
        {chips.map((chip, idx) => (
          <Badge key={idx} icon="sparkles-outline">
            {chip.label}
          </Badge>
        ))}
      </Row>
    </View>
  );
}

function HotelWebRedirectCard({ place }: { place: string }) {
  const openWeb = () => {
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';
    const destinationUrl = `${webUrl}/hotels?q=${encodeURIComponent(place)}`;
    void Linking.openURL(destinationUrl);
  };

  return (
    <Card style={{ backgroundColor: colors.seaMist, borderColor: colors.teal, borderWidth: 1 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: spacing.xs, paddingRight: spacing.sm }}>
          <Row style={{ gap: spacing.xs, alignItems: 'center' }}>
            <Icon name="business-outline" size={16} color={colors.tealInk} />
            <Txt variant="caption" style={{ color: colors.tealInk, fontFamily: nativeFonts.semibold }}>
              TRIPFLIX WEB
            </Txt>
          </Row>
          <Txt variant="heading">Khách sạn tại {place}</Txt>
          <Txt variant="small" style={ui.muted}>
            Xem danh sách phòng, giá và đặt chỗ trên website TripFlix
          </Txt>
        </View>
        <Button tone="teal" icon="arrow-forward" onPress={openWeb}>
          Mở Web
        </Button>
      </Row>
    </Card>
  );
}

function PostSearchResultCard({ item }: { item: ExploreItemDto }) {
  const isPlan = item.kind === 'plan';
  const isVideo = item.kind === 'video';
  const openPost = () =>
    router.push({
      pathname: '/trip/[slug]',
      params: { slug: item.refId },
    });

  return (
    <Card>
      <Pressable accessibilityRole="button" onPress={openPost}>
        {item.thumbnail ? (
          <Image
            source={item.thumbnail}
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              borderRadius: radius.md,
              backgroundColor: colors.seaMist,
            }}
            contentFit="cover"
          />
        ) : null}
      </Pressable>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Badge tone={isPlan ? 'teal' : isVideo ? 'coral' : 'sun'}>
          {isPlan ? `Lộ trình ${item.days ? `· ${item.days}N` : ''}` : isVideo ? 'Video' : 'Bài viết'}
        </Badge>
        {item.subtitle ? (
          <Txt variant="caption" style={ui.muted}>
            📍 {item.subtitle}
          </Txt>
        ) : null}
      </Row>
      <Txt variant="heading">{item.title}</Txt>
      {item.reason ? (
        <Txt variant="small" style={{ color: colors.coralInk }}>
          {item.reason}
        </Txt>
      ) : null}
      {item.priceFrom != null && (
        <Txt variant="label">
          Chi phí: ~{money(item.priceFrom)} / người
        </Txt>
      )}
      <Button tone="secondary" icon="arrow-forward" onPress={openPost}>
        Xem bài viết
      </Button>
    </Card>
  );
}

export function LiveSearchScreen({ back = false }: { back?: boolean } = {}) {
  const { q, autoFocus } = useLocalSearchParams<{ q?: string; autoFocus?: string }>();
  const [prevQ, setPrevQ] = useState(q);
  const [text, setText] = useState(q ?? '');
  const [submittedQuery, setSubmittedQuery] = useState(q?.trim() ?? '');
  const [postType, setPostType] = useState<SearchPostsRequestDtoPostType>('all');
  const [cursor, setCursor] = useState<string | null>(null);
  const [category, setCategory] = useState<'all' | 'sea' | 'weekend'>('all');
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  if (q !== prevQ) {
    setPrevQ(q);
    setText(q ?? '');
    setSubmittedQuery(q?.trim() ?? '');
  }

  useEffect(() => {
    if (autoFocus === '1' || autoFocus === 'true') {
      const timer = setTimeout(() => {
        input.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const isBrowsing = !back && !submittedQuery && !text.trim();

  const search = usePostSearch({
    q: submittedQuery,
    postType,
    cursor,
  });

  const submitSearch = (queryToSubmit?: string) => {
    const target = (queryToSubmit ?? text).trim();
    if (!target) return;
    setText(target);
    setSubmittedQuery(target);
    setCursor(null);
    input.current?.blur();
  };

  const clearSearch = () => {
    setText('');
    setSubmittedQuery('');
    setCursor(null);
  };

  const handlePostTypeChange = (type: SearchPostsRequestDtoPostType) => {
    setPostType(type);
    setCursor(null);
  };

  const understood = search.data?.understood;
  const items = search.data?.items ?? [];
  const total = search.data?.total ?? 0;
  const nextCursor = search.data?.nextCursor;

  return (
    <Screen
      title={back ? vi.api.search : undefined}
      back={back}
      right={
        <IconButton
          name="notifications-outline"
          label={copy.common.notification}
          onPress={() => router.push('/notifications')}
        />
      }
    >
      {/* Search Bar at the very top */}
      <View style={styles.searchBar}>
        <Icon name="search-outline" color={colors.textMuted} size={20} />
        <TextInput
          ref={input}
          accessibilityLabel={vi.api.search}
          value={text}
          onChangeText={setText}
          maxLength={100}
          placeholder="Tìm khách sạn, điểm đến, bài viết..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={() => submitSearch()}
          style={styles.searchInput}
        />
        {text.length > 0 && (
          <IconButton name="close-circle-outline" label="Xoá tìm kiếm" onPress={clearSearch} />
        )}
        <IconButton name="arrow-forward-outline" label={vi.api.search} onPress={() => submitSearch()} />
      </View>

      {isBrowsing && (
        <>
          <Button tone="teal" icon="airplane-outline" onPress={() => router.push('/flights')}>
            {vi.flights.title}
          </Button>

          <View style={{ gap: spacing.xs }}>
            <Txt variant="small" style={ui.muted}>
              {copy.explore.intro}
            </Txt>
            <Txt variant="title">{copy.explore.browseTitle}</Txt>
          </View>

          <Row style={styles.categories}>
            <Chip selected={category === 'all'} onPress={() => setCategory('all')}>
              {copy.notifications.all}
            </Chip>
            <Chip selected={category === 'sea'} onPress={() => setCategory('sea')}>
              {copy.explore.sea}
            </Chip>
            <Chip selected={category === 'weekend'} onPress={() => setCategory('weekend')}>
              {copy.explore.weekend}
            </Chip>
          </Row>
          <ExploreHighlights category={category} />
          <StayRecommendations />
        </>
      )}

      {!isBrowsing && (
        <>
          {submittedQuery !== '' && <HotelSearchResults q={submittedQuery} />}
          {/* Post Type Filter Tabs */}
          <Row style={styles.categories}>
            <Chip selected={postType === 'all'} onPress={() => handlePostTypeChange('all')}>
              Tất cả
            </Chip>
            <Chip selected={postType === 'plan'} onPress={() => handlePostTypeChange('plan')}>
              Lộ trình
            </Chip>
            <Chip selected={postType === 'video'} onPress={() => handlePostTypeChange('video')}>
              Video
            </Chip>
            <Chip selected={postType === 'post'} onPress={() => handlePostTypeChange('post')}>
              Bài viết
            </Chip>
          </Row>

          {/* Understood Chips */}
          {understood && (
            <UnderstoodChips
              understood={understood}
              onRemoveBudget={() => {
                const next = relaxBudgetQuery(submittedQuery, understood.place);
                submitSearch(next);
              }}
              onRemoveDays={() => {
                const next = relaxDaysQuery(submittedQuery, understood.place);
                submitSearch(next);
              }}
            />
          )}

          {/* Web Redirect Banner if destination is recognized */}
          {understood?.place && <HotelWebRedirectCard place={understood.place} />}

          {/* Loading */}
          {search.isPending && <Txt>{vi.api.loading}</Txt>}

          {/* Error */}
          <ApiErrorNotice
            error={search.error}
            retry={() => {
              void search.refetch();
            }}
          />

          {/* Empty State - TF27 Core Requirement */}
          {!search.isPending && search.data && items.length === 0 && (
            <View style={{ gap: spacing.lg }}>
              <Empty
                pose="curious"
                title="Không có kết quả phù hợp"
                body={
                  understood?.budget
                    ? `Không tìm thấy bài viết hoặc lộ trình nào phù hợp với ngân sách dưới ${money(understood.budget)}.`
                    : `Chưa có bài viết phù hợp với "${submittedQuery}". Không hiển thị bài viết không liên quan.`
                }
              />
              <Card>
                <Txt variant="heading">Gợi ý nới điều kiện tìm kiếm</Txt>
                <Txt variant="small" style={ui.muted}>
                  Thử nới lỏng các tiêu chí để khám phá thêm nhiều trải nghiệm:
                </Txt>
                <Row style={styles.categories}>
                  {!!understood?.budget && (
                    <Chip
                      onPress={() => {
                        const next = relaxBudgetQuery(submittedQuery, understood.place);
                        submitSearch(next);
                      }}
                    >
                      Bỏ giới hạn giá
                    </Chip>
                  )}
                  {!!understood?.days && (
                    <Chip
                      onPress={() => {
                        const next = relaxDaysQuery(submittedQuery, understood.place);
                        submitSearch(next);
                      }}
                    >
                      Xem mọi số ngày
                    </Chip>
                  )}
                  {!!understood?.place && (
                    <Chip onPress={() => submitSearch(understood.place!)}>
                      Tất cả bài tại {understood.place}
                    </Chip>
                  )}
                  <Chip onPress={() => submitSearch('Đà Lạt chill')}>Đà Lạt chill</Chip>
                  <Chip onPress={() => submitSearch('Hội An')}>Hội An</Chip>
                  <Chip onPress={() => submitSearch('Hà Giang 3N2Đ')}>Hà Giang 3N2Đ</Chip>
                </Row>
              </Card>
            </View>
          )}

          {/* Results List */}
          {items.length > 0 && (
            <>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt variant="title" style={ui.flex}>
                  Kết quả tìm kiếm
                </Txt>
                <Txt variant="small" style={ui.muted}>
                  {total} bài viết
                </Txt>
              </Row>
              {items.map((item) => (
                <PostSearchResultCard key={item.id} item={item} />
              ))}
              {nextCursor && (
                <Button disabled={search.isFetching} onPress={() => setCursor(nextCursor)}>
                  {vi.api.next}
                </Button>
              )}
              {cursor && (
                <Button tone="text" onPress={() => setCursor(null)}>
                  {vi.api.previous}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function ExploreHighlights({ category }: { category: 'all' | 'sea' | 'weekend' }) {
  const isWeekend = category === 'weekend';
  const destinations = [
    { name: copy.explore.nhaTrang, image: assets.beach },
    category === 'sea'
      ? { name: copy.explore.haLong, image: assets.vietnam }
      : { name: copy.explore.hoiAn, image: assets.hoiAn },
  ];
  const openSearch = (q?: string) => router.push({ pathname: '/search', params: q ? { q } : {} });
  const featured = destinations[isWeekend ? 1 : 0]!;
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => openSearch(featured.name)} style={styles.hero}>
        <Image
          source={isWeekend ? featured.image : assets.vietnam}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <View style={styles.heroShade} />
        <Badge tone="sun" icon="sunny-outline">
          {copy.explore.mood}
        </Badge>
        <View style={{ gap: spacing.sm }}>
          <Txt variant="title" style={styles.heroTitle}>
            {isWeekend ? copy.explore.weekendHero : copy.explore.beachHero}
          </Txt>
          <Row>
            <Txt variant="caption" style={styles.heroBody}>
              {copy.explore.liveHeroBody}
            </Txt>
            <View style={styles.heroArrow}>
              <Icon name="arrow-forward" color={colors.background} size={18} />
            </View>
          </Row>
        </View>
      </Pressable>
      <View style={{ gap: spacing.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading" style={ui.flex}>
            {isWeekend
              ? copy.explore.weekendTitle
              : category === 'sea'
                ? copy.explore.beachTitle
                : copy.explore.curatedTitle}
          </Txt>
          <Button tone="text" onPress={() => openSearch()} icon="arrow-forward">
            {copy.common.viewAll}
          </Button>
        </Row>
        <View style={styles.destinations}>
          {(isWeekend ? [...destinations].reverse() : destinations).map((destination) => (
            <Pressable
              key={destination.name}
              accessibilityRole="button"
              onPress={() => openSearch(destination.name)}
              style={styles.destination}
            >
              <Image source={destination.image} style={styles.destinationImage} contentFit="cover" />
              <Txt variant="label">{destination.name}</Txt>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/assistant')}
        style={styles.assistant}
      >
        <Mascot size={60} />
        <View style={ui.flex}>
          <Txt variant="label">{copy.explore.assistantTitle}</Txt>
          <Txt variant="caption" style={ui.muted}>
            {copy.explore.assistantBody}
          </Txt>
        </View>
        <Icon name="arrow-forward" size={18} color={colors.tealInk} />
      </Pressable>
    </>
  );
}

function StayRecommendations() {
  const { isReady } = useApiSession();
  const query = useQuery({
    queryKey: ['discovery', 'home-recommendations', RECOMMENDATION_LIMIT],
    enabled: isReady,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const response = await homeRecommendationsControllerRecommendForHome(
        { limit: RECOMMENDATION_LIMIT },
        { signal },
      );
      if (response.status !== 200 || !Array.isArray(response.data.items)) {
        throw new Error('Unexpected hotel recommendations response');
      }
      return response.data.items;
    },
  });

  return (
    <>
      <Txt variant="heading">{vi.api.suggestionsLabel}</Txt>
      {query.isPending && <Txt>{vi.api.loading}</Txt>}
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.data?.length === 0 && <Notice>{vi.api.noSuggestions}</Notice>}
      {query.data?.map((dest) => {
        const bestStay = dest.hotels[0];
        if (!bestStay) return null;
        return (
          <Card key={dest.province.slug || bestStay.hotelId} style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={bestStay.name}
              onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: bestStay.hotelId } })}
            >
              <View>
                {bestStay.thumbnail ? (
                  <Image
                    source={bestStay.thumbnail}
                    style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.seaMist }}
                    contentFit="cover"
                  />
                ) : (
                  <View style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.seaMist }} />
                )}
                {/* Nhãn nổi trên ảnh như thẻ khách sạn của web. */}
                <Row style={{ position: 'absolute', top: spacing.sm, left: spacing.sm, gap: spacing.xs }}>
                  <Badge tone="teal" icon="location-outline">
                    {dest.province.name}
                  </Badge>
                  {bestStay.stars ? <Badge tone="sun">{`${bestStay.stars} ★`}</Badge> : null}
                </Row>
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    paddingHorizontal: spacing.md,
                    paddingTop: spacing.xl,
                    paddingBottom: spacing.sm,
                    backgroundColor: colors.overlay,
                  }}
                >
                  <Txt variant="heading" style={{ color: colors.background }} numberOfLines={2}>
                    {bestStay.name}
                  </Txt>
                </View>
              </View>
            </Pressable>
            <View style={{ padding: spacing.md, gap: spacing.sm }}>
              <Row
                style={{
                  gap: spacing.xs,
                  alignItems: 'flex-start',
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: colors.seaMist,
                }}
              >
                <Icon name="pricetag-outline" size={16} color={colors.tealInk} />
                <Txt variant="small" style={{ flex: 1, color: colors.tealInk }}>
                  {bestStay.reason.text}
                </Txt>
              </Row>
              <Row style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm }}>
                <View style={{ flexShrink: 1 }}>
                  <Txt variant="small" style={{ color: colors.textMuted }}>
                    {vi.hotel.from}
                  </Txt>
                  <Txt variant="title" style={{ color: colors.coralInk }}>
                    {money(bestStay.priceFrom)}
                  </Txt>
                  <Txt variant="small" style={{ color: colors.textMuted }}>
                    / {vi.api.perNight}
                  </Txt>
                </View>
                <Button
                  icon="arrow-forward"
                  onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: bestStay.hotelId } })}
                >
                  {vi.hotel.viewRooms}
                </Button>
              </Row>
              {dest.otherDealsCount > 0 && (
                <Button
                  tone="text"
                  onPress={() => router.push({ pathname: '/search', params: { q: dest.province.name } })}
                  icon="arrow-forward"
                >
                  {`Khám phá thêm ${dest.otherDealsCount} deal hời`}
                </Button>
              )}
            </View>
          </Card>
        );
      })}
    </>
  );
}

export function LiveSearchEntry() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  return view === 'mine' ? <LiveFeedScreen kind="mine" /> : <LiveSearchScreen back />;
}
export function LiveAssistantScreen() {
  return (
    <Screen title={copy.assistant.badge}>
      <Row style={styles.assistant}>
        <Mascot size={72} />
        <View style={ui.flex}>
          <Txt variant="heading">{copy.assistant.headline}</Txt>
          <Txt variant="small" style={ui.muted}>
            {copy.assistant.body}
          </Txt>
        </View>
      </Row>
      <Notice>{vi.api.assistantUnavailable}</Notice>
      <Button icon="arrow-forward" onPress={() => router.push('/search')}>
        {vi.api.search}
      </Button>
    </Screen>
  );
}
export function LiveHotelScreen() {
  return <UnavailableScreen message={vi.api.hotelUnavailable} />;
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: mobileLayout.buttonHeight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.warmMist,
    paddingLeft: spacing.md,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: mobileLayout.touchTarget,
    fontFamily: nativeFonts.regular,
    color: colors.ink,
    fontSize: 14,
  },
  result: { alignItems: 'flex-start' },
  resultPhoto: { width: 90, height: 112, borderRadius: radius.md, backgroundColor: colors.seaMist },
  categories: { flexWrap: 'wrap', gap: spacing.sm },
  hero: {
    minHeight: 235,
    borderRadius: mobileLayout.cardRadius,
    overflow: 'hidden',
    padding: spacing.lg,
    justifyContent: 'space-between',
    gap: spacing.xl,
    backgroundColor: colors.ink,
  },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  heroTitle: { fontSize: 30, lineHeight: 37, color: colors.background },
  heroBody: { flex: 1, color: colors.background, fontFamily: nativeFonts.semibold },
  heroArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinations: { flexDirection: 'row', gap: spacing.md },
  destination: { flex: 1, minWidth: 0, gap: spacing.sm },
  destinationImage: { width: '100%', height: 124, borderRadius: radius.lg, backgroundColor: colors.seaMist },
  assistant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.seaMist,
  },
});
