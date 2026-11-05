import { useStaySearch, type StayFilters } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useLocalSearchParams } from 'expo-router';
import { Button, Card, Chip, Field, money, Notice, Row, Screen, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice, UnavailableScreen } from '@/components/api-state';
import { LiveFeedScreen } from '@/features/feed/live-feed-screen';
import { View } from 'react-native';

export function LiveSearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const search = useStaySearch(q);
  const update = (key: keyof StayFilters, value: string) =>
    search.setFilters((previous) => ({ ...previous, [key]: value }));
  return (
    <Screen title={vi.api.stays}>
      <Field
        label={vi.api.search}
        value={search.text}
        onChangeText={(value) => {
          search.setText(value);
          update('placeId', '');
        }}
        maxLength={100}
        placeholder={vi.api.searchHint}
      />
      <ApiErrorNotice
        error={search.suggestions.error}
        retry={() => {
          void search.suggestions.refetch();
        }}
      />
      {search.suggestions.isFetching && <Txt>{vi.api.loading}</Txt>}
      {search.suggestions.data?.items.length === 0 && <Notice>{vi.api.noSuggestions}</Notice>}
      {search.suggestions.data?.items.map((place) => (
        <Chip
          key={place.id}
          selected={search.selection?.id === place.id}
          onPress={() => search.choosePlace(place)}
        >
          {place.name}
          {place.subtitle ? ` · ${place.subtitle}` : ''}
        </Chip>
      ))}
      {search.selection?.type === 'hotel' && <Notice>{vi.api.hotelUnavailable}</Notice>}
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
      <Button disabled={!search.filters.placeId || search.stays.isFetching} onPress={search.submit}>
        {search.stays.isFetching ? vi.api.loading : vi.api.findStays}
      </Button>
      {!search.submitted && <Notice>{vi.api.choosePlace}</Notice>}
      <ApiErrorNotice
        error={search.stays.error}
        retry={() => {
          void search.stays.refetch();
        }}
      />
      {search.stays.data?.items.length === 0 && <Notice>{vi.api.noStays}</Notice>}
      {search.stays.data?.items.map((stay) => (
        <Card key={stay.hotelId}>
          <Txt variant="heading">{stay.name}</Txt>
          <Txt>
            {stay.province.name}
            {stay.stars ? ` · ${stay.stars} ★` : ''}
          </Txt>
          <Txt>
            {money(stay.unitPrice)} / {vi.api.perNight}
          </Txt>
          <Txt variant="label">
            {vi.api.total}: {money(stay.totalPrice)}
          </Txt>
          <Notice>{vi.api.bookingUnavailable}</Notice>
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
    </Screen>
  );
}
export function LiveSearchEntry() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  return view === 'mine' ? <LiveFeedScreen kind="mine" /> : <LiveSearchScreen />;
}
export function LiveAssistantScreen() {
  return <UnavailableScreen message={vi.api.assistantUnavailable} />;
}
export function LiveHotelScreen() {
  return <UnavailableScreen message={vi.api.hotelUnavailable} />;
}
