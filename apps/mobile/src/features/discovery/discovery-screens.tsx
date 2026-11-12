import { searchReviewTrips } from '@tripflix/app-core';
import { colors as c, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  assets,
  Badge,
  Button,
  Card,
  Chip,
  copy,
  Empty,
  Field,
  Icon,
  IconButton,
  Mascot,
  money,
  Notice,
  Row,
  Screen,
  Sheet,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { TripCard } from './trip-card';
import { useReview } from '@/features/review/review-provider';

export function ExploreScreen() {
  const review = useReview();
  const [category, setCategory] = useState(0);
  return (
    <Screen
      back={false}
      right={
        <IconButton
          name="notifications-outline"
          label={copy.common.notification}
          onPress={() => router.push('/notifications')}
        />
      }
    >
      <View style={{ gap: s.sm }}>
        <Txt variant="small" style={{ color: c.tealInk }}>
          {copy.explore.greeting}
        </Txt>
        <Txt variant="title">{copy.explore.title}</Txt>
        <Txt variant="small" style={ui.muted}>
          {copy.explore.subtitle}
        </Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/search')}
        style={[ui.input, ui.row, { backgroundColor: c.warmMist }]}
      >
        <Icon name="search-outline" />
        <Txt variant="small" style={[ui.muted, ui.flex]}>
          {copy.explore.placeholder}
        </Txt>
        <Icon name="options-outline" size={20} />
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: s.sm }}>
        {[copy.explore.sea, copy.explore.weekend, copy.explore.food, copy.explore.nature].map(
          (label, index) => (
            <Chip key={label} selected={category === index} onPress={() => setCategory(index)}>
              {label}
            </Chip>
          ),
        )}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.common.tripName}
        onPress={() => {
          review.setQuery(
            category === 2 || category === 3 ? copy.explore.natureQuery : copy.explore.defaultQuery,
          );
          router.push('/search');
        }}
        style={{ height: 250, borderRadius: 24, overflow: 'hidden', backgroundColor: c.tealInk }}
      >
        <Image
          source={category === 2 ? assets.hoiAn : assets.sea}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: c.overlay,
            padding: s.lg,
            justifyContent: 'space-between',
          }}
        >
          <Badge tone="sun">
            {category === 2
              ? copy.explore.food
              : category === 3
                ? copy.explore.nature
                : copy.explore.heroBadge}
          </Badge>
          <View style={{ gap: s.sm }}>
            <Txt variant="title" style={{ color: c.background }}>
              {copy.explore.heroTitle}
            </Txt>
            <Row>
              <Txt variant="small" style={{ color: c.background, flex: 1 }}>
                {copy.explore.heroBody}
              </Txt>
              <Icon name="arrow-forward-circle-outline" color={c.background} size={36} />
            </Row>
          </View>
        </View>
      </Pressable>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="heading" style={ui.flex}>
          {copy.explore.curated}
        </Txt>
        <IconButton name="arrow-forward" label={copy.common.viewAll} onPress={() => router.push('/search')} />
      </Row>
      <TripCard />
      <Txt variant="caption" style={ui.muted}>
        {copy.common.source}
      </Txt>
    </Screen>
  );
}

export function SearchScreen() {
  const review = useReview();
  const params = useLocalSearchParams<{ scenario?: string }>();
  const [input, setInput] = useState(review.query);
  const [hasFilters, setFilters] = useState(false);
  const criteria = searchReviewTrips(review.query);
  const isEmpty = params.scenario === 'empty' || !criteria.hasResults;
  function search() {
    review.setQuery(input);
  }
  function openResult() {
    review.setSelection((previous) => ({
      ...previous,
      guests: criteria.guests,
      hasFlight: !criteria.hotelOnly,
    }));
    router.push(criteria.hotelOnly ? '/hotel' : '/itinerary');
  }
  return (
    <Screen title={copy.common.search}>
      <Field
        label={copy.explore.filterTitle}
        value={input}
        onChangeText={setInput}
        placeholder={copy.explore.placeholder}
        returnKeyType="search"
        onSubmitEditing={search}
      />
      <Button onPress={search} icon="search-outline">
        {copy.common.search}
      </Button>
      <Row>
        <Txt variant="title" style={ui.flex}>
          {copy.explore.searchTitle}
        </Txt>
        <IconButton name="options-outline" label={copy.common.edit} onPress={() => setFilters(true)} />
      </Row>
      <Txt variant="small" style={ui.muted}>
        {copy.explore.understood}
      </Txt>
      <Row style={{ flexWrap: 'wrap' }}>
        <Badge icon="people-outline">
          {criteria.guests} {copy.booking.guestsUnit}
        </Badge>
        <Badge icon="wallet-outline">
          {Number.isFinite(criteria.budget) ? money(criteria.budget) : copy.common.reference}{' '}
          {copy.common.perGuest}
        </Badge>
        <Badge>{criteria.hotelOnly ? copy.booking.accommodation : copy.explore.package}</Badge>
      </Row>
      {isEmpty ? (
        <Empty
          pose="curious"
          title={copy.explore.emptyTitle}
          body={copy.explore.emptyBody}
          action={copy.explore.reset}
          onAction={() => {
            setFilters(true);
          }}
        />
      ) : (
        <>
          <Txt variant="caption" style={ui.muted}>
            {copy.explore.resultCount} · {copy.common.demo}
          </Txt>
          <Pressable
            accessibilityRole="button"
            onPress={openResult}
            style={[ui.card, { padding: 0, overflow: 'hidden' }]}
          >
            <Image
              source={criteria.hotelOnly ? assets.hotel : assets.beach}
              style={{ height: 180, width: '100%' }}
            />
            <View style={{ padding: s.lg, gap: s.sm }}>
              <Badge icon="checkmark">{copy.explore.match}</Badge>
              <Txt variant="heading">{criteria.hotelOnly ? copy.common.hotelName : copy.common.tripName}</Txt>
              <Txt variant="small" style={ui.muted}>
                {criteria.hotelOnly ? copy.explore.hotelOnly : copy.explore.package}
              </Txt>
              <Txt variant="heading" style={{ color: c.coralInk }}>
                {money(criteria.perGuest)} <Txt variant="small">{copy.common.perGuest}</Txt>
              </Txt>
              <Txt variant="small" style={{ color: c.tealInk }}>
                {copy.explore.reason}
              </Txt>
            </View>
          </Pressable>
        </>
      )}
      <Sheet title={copy.explore.filterTitle} visible={hasFilters} onClose={() => setFilters(false)}>
        <Field label={copy.common.search} value={input} onChangeText={setInput} multiline />
        <Button
          onPress={() => {
            search();
            setFilters(false);
          }}
        >
          {copy.common.search}
        </Button>
        <Button
          tone="secondary"
          onPress={() => {
            setInput(copy.explore.defaultQuery);
            review.setQuery(copy.explore.defaultQuery);
            setFilters(false);
          }}
        >
          {copy.explore.defaultQuery}
        </Button>
      </Sheet>
    </Screen>
  );
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  query?: string;
}
export function AssistantScreen() {
  const review = useReview();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  function send(text: string) {
    if (!text.trim()) return;
    const criteria = searchReviewTrips(text);
    setMessages((previous) => [
      ...previous,
      { role: 'user', text: text.trim() },
      {
        role: 'assistant',
        text: criteria.hasResults ? copy.assistant.reply : copy.assistant.emptyReply,
        query: criteria.hasResults ? text : undefined,
      },
    ]);
    setInput('');
  }
  return (
    <Screen
      title={copy.assistant.title}
      right={
        <IconButton
          name="refresh-outline"
          label={copy.assistant.reset}
          onPress={() => {
            setMessages([]);
            setInput('');
          }}
        />
      }
      footer={
        <Row>
          <View style={ui.flex}>
            <Field
              label={copy.assistant.placeholder}
              value={input}
              onChangeText={setInput}
              placeholder={copy.assistant.placeholder}
              returnKeyType="send"
              onSubmitEditing={() => send(input)}
            />
          </View>
          <Button onPress={() => send(input)} disabled={!input.trim()} icon="arrow-up">
            {copy.assistant.send}
          </Button>
        </Row>
      }
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: c.seaMist,
          marginHorizontal: -20,
          padding: s.xl,
          gap: s.md,
        }}
      >
        <Mascot size={136} />
        <Badge icon="sparkles-outline">{copy.assistant.badge}</Badge>
        <Txt variant="title" style={ui.center}>
          {copy.assistant.headline}
        </Txt>
        <Txt variant="small" style={{ color: c.tealInk }}>
          {copy.assistant.body}
        </Txt>
      </View>
      <Notice>{copy.assistant.greeting}</Notice>
      {messages.length === 0 &&
        [copy.explore.defaultQuery, copy.explore.hotelQuery, copy.explore.weekendQuery].map((suggestion) => (
          <Button key={suggestion} tone="secondary" onPress={() => send(suggestion)} icon="arrow-up-outline">
            {suggestion}
          </Button>
        ))}
      {messages.map((message, index) => (
        <Card
          key={`${index}-${message.role}`}
          style={{
            backgroundColor: message.role === 'user' ? c.seaMist : c.warmMist,
            alignSelf: message.role === 'user' ? 'flex-end' : 'stretch',
            maxWidth: '100%',
          }}
        >
          <Txt variant="small">{message.text}</Txt>
          {message.query && (
            <Button
              tone="secondary"
              icon="arrow-forward"
              onPress={() => {
                review.setQuery(message.query!);
                router.push('/search');
              }}
            >
              {copy.explore.searchTitle}
            </Button>
          )}
        </Card>
      ))}
      <Txt variant="caption" style={ui.muted}>
        {copy.assistant.notice}
      </Txt>
    </Screen>
  );
}
