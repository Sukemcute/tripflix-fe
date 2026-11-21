import * as Linking from 'expo-linking';
import {
  useApiSession,
  getApiErrorKind,
  usePostSearch,
  type ExploreItemDto,
  type ExploreUnderstoodDto,
  type SearchPostsRequestDtoPostType,
} from '@tripflix/api-client';
import type { SearchPostsRequestDtoSort } from '@tripflix/api-client/core-api/model/index';
import { homeRecommendationsControllerRecommendForHome } from '@tripflix/api-client/core-api/discovery/discovery';
import { vi } from '@tripflix/i18n';
import { explorer as x, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
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
import { HotelSearchResults, TripHotelSearchScreen } from './hotel-search-results';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SearchDropPanel } from './search-drop-panel';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { NotificationBell } from '@/features/account/notification-bell';
import {
  ExploreHome,
  ExploreStayCard,
  ExploreStaysHeading,
  ExploreStaysLoading,
  ExploreStaysNotice,
} from './explore-home';
import { LoadingDots } from '@/components/loading-dots';

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
    <Card style={{ backgroundColor: x.day.tintExplore, borderColor: x.day.link, borderWidth: 1 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: spacing.xs, paddingRight: spacing.sm }}>
          <Row style={{ gap: spacing.xs, alignItems: 'center' }}>
            <Icon name="business-outline" size={16} color={x.day.link} />
            <Txt variant="caption" style={{ color: x.day.link, fontFamily: nativeFonts.semibold }}>
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
              backgroundColor: x.day.tintExplore,
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
        <Txt variant="small" style={{ color: x.day.text }}>
          {item.reason}
        </Txt>
      ) : null}
      {item.priceFrom != null && <Txt variant="label">Chi phí: ~{money(item.priceFrom)} / người</Txt>}
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
  const [sort, setSort] = useState<SearchPostsRequestDtoSort>('relevance');
  const [cursor, setCursor] = useState<string | null>(null);
  const [category, setCategory] = useState<'all' | 'sea' | 'weekend'>('all');
  // Tab Khám phá: bấm thanh search mở khung thả xuống thay vì gõ ngay trên trang.
  const [isSearchOpen, setIsSearchOpen] = useState(!back && (autoFocus === '1' || autoFocus === 'true'));
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
    sort,
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

  const handleSortChange = (nextSort: SearchPostsRequestDtoSort) => {
    setSort(nextSort);
    setCursor(null);
  };

  const understood = search.data?.understood;
  const items = search.data?.items ?? [];
  const total = search.data?.total ?? 0;
  const nextCursor = search.data?.nextCursor;

  if (isBrowsing)
    return (
      <ExploreHome
        category={category}
        onCategoryChange={setCategory}
        searchOpen={isSearchOpen}
        onSearchOpen={() => setIsSearchOpen(true)}
        onSearchClose={() => setIsSearchOpen(false)}
      >
        <StayRecommendations />
      </ExploreHome>
    );

  return (
    <Screen compact title={back ? vi.api.search : undefined} back={back} right={<NotificationBell />}>
      <SearchDropPanel visible={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      {!back ? (
        <Pressable
          accessibilityRole="search"
          accessibilityLabel={vi.mobile.searchPanel.placeholder}
          style={styles.searchBar}
          onPress={() => setIsSearchOpen(true)}
        >
          <Icon name="search-outline" color={x.day.textSecondary} size={mobileIconSize.control} />
          <Txt style={[styles.searchInput, { color: x.day.textSecondary }]}>
            {vi.mobile.searchPanel.placeholder}
          </Txt>
        </Pressable>
      ) : (
        <View style={styles.searchBar}>
          <Icon name="search-outline" color={x.day.textSecondary} size={mobileIconSize.control} />
          <TextInput
            ref={input}
            accessibilityLabel={vi.api.search}
            value={text}
            onChangeText={setText}
            maxLength={100}
            placeholder="Tìm khách sạn, điểm đến, bài viết..."
            placeholderTextColor={x.day.textSecondary}
            returnKeyType="search"
            onSubmitEditing={() => submitSearch()}
            style={styles.searchInput}
          />
          {text.length > 0 && (
            <IconButton name="close-circle-outline" label="Xoá tìm kiếm" onPress={clearSearch} />
          )}
          <IconButton name="arrow-forward-outline" label={vi.api.search} onPress={() => submitSearch()} />
        </View>
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

          {/* Sort Tabs */}
          <Row style={styles.categories}>
            <Chip selected={sort === 'relevance'} onPress={() => handleSortChange('relevance')}>
              {vi.api.postSortRelevance}
            </Chip>
            <Chip selected={sort === 'trending'} onPress={() => handleSortChange('trending')}>
              {vi.api.postSortTrending}
            </Chip>
            <Chip selected={sort === 'recent'} onPress={() => handleSortChange('recent')}>
              {vi.api.postSortRecent}
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
          {search.isPending && <LoadingDots />}

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

  const destinations = query.data?.filter((destination) => destination.hotels.length > 0);
  return (
    <>
      <ExploreStaysHeading />
      {query.isPending && <ExploreStaysLoading />}
      {query.error && (
        <ExploreStaysNotice
          message={vi.api[getApiErrorKind(query.error)]}
          busy={query.isFetching}
          retry={() => {
            void query.refetch();
          }}
        />
      )}
      {destinations?.length === 0 && <ExploreStaysNotice message={vi.api.noSuggestions} />}
      {destinations?.map((destination) => (
        <ExploreStayCard
          key={destination.province.slug || destination.hotels[0]?.hotelId}
          destination={destination}
        />
      ))}
    </>
  );
}

export function LiveSearchEntry() {
  const { view, pick, pickId, pickKey, q, checkIn, checkOut, adults } = useLocalSearchParams<{
    view?: string;
    pick?: string;
    pickId?: string;
    pickKey?: string;
    q?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
  }>();
  if (pick === 'post' && pickKey && checkIn && checkOut && adults) {
    return (
      <TripHotelSearchScreen q={q ?? ''} pick={{ key: pickKey, checkIn, checkOut, adults, mode: 'post' }} />
    );
  }
  // pickId 'hotelProperty:<chặng ở>': đổi khách sạn của một chặng khi đặt theo lộ trình.
  if (pick === 'trip' && pickId?.startsWith('hotelProperty') && pickKey && checkIn && checkOut && adults) {
    const stayId = pickId.split(':')[1] || 'hotel0';
    return <TripHotelSearchScreen q={q ?? ''} pick={{ key: pickKey, checkIn, checkOut, adults, stayId }} />;
  }
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
    borderColor: x.day.line,
    backgroundColor: x.day.tintWarm,
    paddingLeft: spacing.md,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: mobileLayout.touchTarget,
    fontFamily: nativeFonts.regular,
    color: x.day.text,
    ...compactType.body,
  },
  result: { alignItems: 'flex-start' },
  resultPhoto: { width: 90, height: 112, borderRadius: radius.md, backgroundColor: x.day.tintExplore },
  categories: { flexWrap: 'wrap', gap: spacing.sm },
  assistant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: x.day.tintExplore,
  },
});
