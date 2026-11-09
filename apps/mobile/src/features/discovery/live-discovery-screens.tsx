import { useApiSession, useStaySearch, type StayFilters } from '@tripflix/api-client';
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
  Field,
  formatDate,
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
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

const RECOMMENDATION_LIMIT = 3;

export function LiveSearchScreen({ back = false }: { back?: boolean } = {}) {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const search = useStaySearch(q);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [category, setCategory] = useState<'all' | 'sea' | 'weekend'>('all');
  const [editingFilters, setEditingFilters] = useState(false);
  const { submitted } = search;
  const isBrowsing = !back && !search.text.trim() && !search.submitted;
  const update = (key: keyof StayFilters, value: string) =>
    search.setFilters((previous) => ({ ...previous, [key]: value }));
  const submit = () => {
    setEditingFilters(false);
    input.current?.blur();
    search.submit();
  };
  const focusOrSubmit = () => {
    if (search.filters.placeId && !search.stays.isFetching) submit();
    else input.current?.focus();
  };
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
      {isBrowsing && (
        <View style={{ gap: spacing.xs }}>
          <Txt variant="small" style={ui.muted}>
            {copy.explore.intro}
          </Txt>
          <Txt variant="title">{copy.explore.browseTitle}</Txt>
        </View>
      )}
      <Button tone="teal" icon="airplane-outline" onPress={() => router.push('/flights')}>
        {vi.flights.title}
      </Button>
      <View style={styles.searchBar}>
        <Icon name="search-outline" color={colors.textMuted} size={20} />
        <TextInput
          ref={input}
          accessibilityLabel={vi.api.search}
          value={search.text}
          onChangeText={(value) => {
            search.setText(value);
            update('placeId', '');
            setEditingFilters(true);
          }}
          maxLength={100}
          placeholder={copy.explore.livePlaceholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={focusOrSubmit}
          style={styles.searchInput}
        />
        <IconButton name="arrow-forward-outline" label={vi.api.search} onPress={focusOrSubmit} />
      </View>
      {isBrowsing && (
        <>
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
        </>
      )}
      <ApiErrorNotice
        error={search.suggestions.error}
        retry={() => {
          void search.suggestions.refetch();
        }}
      />
      {(!submitted || editingFilters) && search.suggestions.isFetching && <Txt>{vi.api.loading}</Txt>}
      {(!submitted || editingFilters) && search.suggestions.data?.items.length === 0 && (
        <Notice>{vi.api.noSuggestions}</Notice>
      )}
      {(!submitted || editingFilters) &&
        search.suggestions.data?.items.map((place) => (
          <Chip
            key={place.id}
            selected={search.selection?.id === place.id}
            onPress={() => {
              search.choosePlace(place);
              setEditingFilters(true);
            }}
          >
            {place.name}
            {place.subtitle ? ` · ${place.subtitle}` : ''}
          </Chip>
        ))}
      {search.selection?.type === 'hotel' && (
        <Button
          onPress={() =>
            router.push({
              pathname: '/hotel/[id]',
              params: {
                id: search.selection!.refId,
                checkIn: search.filters.checkIn,
                checkOut: search.filters.checkOut,
                adults: search.filters.adults,
              },
            })
          }
        >
          {vi.commerce.hotel}
        </Button>
      )}
      {isBrowsing && <StayRecommendations />}
      {!isBrowsing && (
        <>
          <Row>
            <Txt variant="title" style={ui.flex}>
              {copy.explore.searchTitle}
            </Txt>
            {submitted && (
              <IconButton
                name="options-outline"
                label={copy.explore.filterTitle}
                onPress={() => setEditingFilters((value) => !value)}
              />
            )}
          </Row>
          {submitted && !editingFilters && (
            <View style={{ gap: spacing.sm }}>
              <Txt variant="small" style={ui.muted}>
                {copy.explore.stayCriteria}
              </Txt>
              <Row style={styles.categories}>
                <Badge icon="calendar-outline">
                  {formatDate(submitted.checkIn)} → {formatDate(submitted.checkOut)}
                </Badge>
                <Badge icon="people-outline">
                  {submitted.adults} {vi.commerce.guests}
                </Badge>
                {!!submitted.priceMax && Number.isFinite(Number(submitted.priceMax)) && (
                  <Badge icon="wallet-outline">
                    ≤ {money(Number(submitted.priceMax))} / {vi.commerce.nights}
                  </Badge>
                )}
              </Row>
            </View>
          )}
          {(!submitted || editingFilters) && (
            <Card>
              <Txt variant="heading">{copy.explore.filterTitle}</Txt>
              <Field
                label={vi.api.checkIn}
                value={search.filters.checkIn}
                onChangeText={(value) => update('checkIn', value)}
                placeholder="YYYY-MM-DD"
                maxLength={10}
              />
              <Field
                label={vi.api.checkOut}
                value={search.filters.checkOut}
                onChangeText={(value) => update('checkOut', value)}
                placeholder="YYYY-MM-DD"
                maxLength={10}
              />
              <Row>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Field
                    label={vi.api.adults}
                    value={search.filters.adults}
                    onChangeText={(value) => update('adults', value)}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Field
                    label={vi.api.rooms}
                    value={search.filters.rooms}
                    onChangeText={(value) => update('rooms', value)}
                    keyboardType="number-pad"
                  />
                </View>
              </Row>
              <Field
                label={vi.api.minStars}
                value={search.filters.minStars}
                onChangeText={(value) => update('minStars', value)}
                keyboardType="number-pad"
              />
              <Field
                label={vi.api.maxPrice}
                value={search.filters.priceMax}
                onChangeText={(value) => update('priceMax', value)}
                keyboardType="number-pad"
              />
              <Row>
                <Chip selected={search.filters.sort === 'price'} onPress={() => update('sort', 'price')}>
                  {vi.api.price}
                </Chip>
                <Chip selected={search.filters.sort === 'stars'} onPress={() => update('sort', 'stars')}>
                  {vi.api.stars}
                </Chip>
              </Row>
              <Button disabled={!search.filters.placeId || search.stays.isFetching} onPress={submit}>
                {search.stays.isFetching ? vi.api.loading : vi.api.findStays}
              </Button>
              {!search.filters.placeId && <Notice>{vi.api.choosePlace}</Notice>}
            </Card>
          )}
          {!!submitted && search.stays.isFetching && <Txt>{vi.api.loading}</Txt>}
          <ApiErrorNotice
            error={search.stays.error}
            retry={() => {
              void search.stays.refetch();
            }}
          />
          {search.stays.data?.items.length === 0 && (
            <Empty pose="curious" title={copy.explore.emptyTitle} body={vi.api.noStays} />
          )}
          {search.stays.data?.items.map((stay) => (
            <Card key={stay.hotelId}>
              <Row style={styles.result}>
                {stay.thumbnail && (
                  <Image source={stay.thumbnail} style={styles.resultPhoto} contentFit="cover" />
                )}
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Txt variant="heading">{stay.name}</Txt>
                  <Txt variant="small" style={ui.muted}>
                    {stay.province.name}
                    {stay.stars ? ` · ${stay.stars} ★` : ''}
                  </Txt>
                  <Txt variant="label" style={{ color: colors.coralInk }}>
                    {money(stay.unitPrice)} / {vi.api.perNight}
                  </Txt>
                  <Txt variant="caption">
                    {vi.api.total}: {money(stay.totalPrice)}
                  </Txt>
                </View>
              </Row>
              <Button
                tone="secondary"
                icon="arrow-forward"
                onPress={() =>
                  router.push({
                    pathname: '/hotel/[id]',
                    params: {
                      id: stay.hotelId,
                      checkIn: search.submitted!.checkIn,
                      checkOut: search.submitted!.checkOut,
                      adults: search.submitted!.adults,
                    },
                  })
                }
              >
                {vi.commerce.hotel}
              </Button>
            </Card>
          ))}
          {search.stays.data?.nextCursor && (
            <Button disabled={search.stays.isFetching} onPress={search.next}>
              {vi.api.next}
            </Button>
          )}
          {search.cursor && (
            <Button tone="text" onPress={search.first}>
              {vi.api.previous}
            </Button>
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
          <Card key={dest.province.slug || bestStay.hotelId}>
            {bestStay.thumbnail && (
              <Image
                source={bestStay.thumbnail}
                style={{
                  width: '100%',
                  aspectRatio: 16 / 9,
                  borderRadius: radius.md,
                  backgroundColor: colors.seaMist,
                }}
                contentFit="cover"
              />
            )}
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge tone="teal">{dest.province.name}</Badge>
              {bestStay.stars ? (
                <Txt variant="caption" style={{ color: colors.textMuted }}>
                  {bestStay.stars} ★
                </Txt>
              ) : null}
            </Row>
            <Txt variant="heading">{bestStay.name}</Txt>
            <Txt variant="small">{bestStay.reason.text}</Txt>
            <Txt variant="label">
              {vi.hotel.from} {money(bestStay.priceFrom)} / {vi.api.perNight}
            </Txt>
            <Button
              tone="secondary"
              onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: bestStay.hotelId } })}
            >
              {vi.commerce.hotel}
            </Button>
            {dest.otherDealsCount > 0 && (
              <Button
                tone="text"
                onPress={() => router.push({ pathname: '/search', params: { q: dest.province.name } })}
                icon="arrow-forward"
              >
                {`Khám phá thêm ${dest.otherDealsCount} deal hời`}
              </Button>
            )}
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
