import {
  useApiSession,
  getApiErrorKind,
  usePostSearch,
  type ExploreItemDto,
  type SearchPostsRequestDtoPostType,
} from '@tripflix/api-client';
import type { SearchPostsRequestDtoSort } from '@tripflix/api-client/core-api/model/index';
import { homeRecommendationsControllerRecommendForHome } from '@tripflix/api-client/core-api/discovery/discovery';
import { t, vi } from '@tripflix/i18n';
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
import { SkeletonCards } from '@/components/skeleton-card';
import { SearchResultFilters } from './search-result-filters';
import { relaxBudgetQuery, relaxDaysQuery } from './search-query-relax';
import { UnderstoodBar } from './understood-bar';

const RECOMMENDATION_LIMIT = 3;

/** Địa điểm đã nhận ra trong câu tìm: mở kết quả khách sạn ngay trong app, không đưa người dùng sang web. */
function HotelResultsCard({ place }: { place: string }) {
  const openHotels = () => router.push({ pathname: '/explore', params: { q: place } });

  return (
    <Card style={{ backgroundColor: x.day.tintExplore, borderColor: x.day.link, borderWidth: 1 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: spacing.xs, paddingRight: spacing.sm }}>
          <Row style={{ gap: spacing.xs, alignItems: 'center' }}>
            <Icon name="bed-outline" size={16} color={x.day.link} />
            <Txt variant="heading">{t('mobile.explore.searchHotelsTitle', { place })}</Txt>
          </Row>
          <Txt variant="small" style={ui.muted}>
            {vi.mobile.explore.searchHotelsBody}
          </Txt>
        </View>
        <Button tone="teal" icon="arrow-forward" onPress={openHotels}>
          {vi.mobile.explore.searchHotelsAction}
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
          {/* Một nút mỗi lúc: chữ đang gõ khác từ đã tìm thì nút tìm, đã tìm rồi thì nút xoá. */}
          {text.trim() && text.trim() !== submittedQuery ? (
            <IconButton name="arrow-forward-outline" label={vi.api.search} onPress={() => submitSearch()} />
          ) : text.length > 0 ? (
            <IconButton name="close-circle-outline" label="Xoá tìm kiếm" onPress={clearSearch} />
          ) : null}
        </View>
      )}

      {!isBrowsing && (
        <>
          {/* Hệ thống hiểu câu tìm thế nào: ngay dưới ô tìm, trước mọi kết quả. */}
          {understood && (
            <UnderstoodBar
              understood={understood}
              onRemoveBudget={() => submitSearch(relaxBudgetQuery(submittedQuery, understood.place))}
              onRemoveDays={() => submitSearch(relaxDaysQuery(submittedQuery, understood.place))}
            />
          )}
          {submittedQuery !== '' && <HotelSearchResults q={submittedQuery} />}
          {/* Lọc loại nội dung và sắp xếp: thanh tab + nút sắp xếp (search-result-filters.tsx). */}
          <SearchResultFilters
            postType={postType}
            sort={sort}
            total={search.data ? total : undefined}
            onPostTypeChange={handlePostTypeChange}
            onSortChange={handleSortChange}
          />

          {understood?.place && <HotelResultsCard place={understood.place} />}

          {/* Khung thẻ giữ chỗ khi đang tìm; chưa bấm tìm thì không có gì để tải. */}
          {search.isPending && submittedQuery !== '' && <SkeletonCards />}

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
