import { calculateTripQuote, shiftTripDate } from '@tripflix/app-core';
import { colors as c, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  assets,
  Badge,
  Button,
  Card,
  Chip,
  copy,
  formatDate,
  Icon,
  IconButton,
  money,
  Notice,
  PriceRow,
  Row,
  Screen,
  Segments,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { useReview } from '@/features/review/review-provider';

export function ItineraryScreen() {
  const review = useReview();
  const [tab, setTab] = useState(0);
  const [day, setDay] = useState(0);
  const quote = calculateTripQuote(review.selection);
  const days = [
    {
      title: copy.itinerary.day1Title,
      stops: [
        {
          title: copy.itinerary.arrival,
          body: copy.itinerary.arrivalBody,
          icon: 'airplane-outline' as const,
        },
        { title: copy.itinerary.checkin, body: copy.itinerary.checkinBody, icon: 'bed-outline' as const },
        {
          title: copy.itinerary.dinner,
          body: copy.itinerary.dinnerBody,
          icon: 'restaurant-outline' as const,
        },
      ],
    },
    {
      title: copy.itinerary.day2Title,
      stops: [
        { title: copy.itinerary.islands, body: copy.itinerary.islandsBody, icon: 'boat-outline' as const },
        { title: copy.itinerary.sunset, body: copy.itinerary.sunsetBody, icon: 'sunny-outline' as const },
      ],
    },
    {
      title: copy.itinerary.day3Title,
      stops: [
        {
          title: copy.itinerary.breakfast,
          body: copy.itinerary.breakfastBody,
          icon: 'cafe-outline' as const,
        },
        {
          title: copy.itinerary.checkout,
          body: copy.itinerary.checkoutBody,
          icon: 'airplane-outline' as const,
        },
      ],
    },
  ];
  return (
    <Screen
      title={copy.itinerary.plan}
      padded={false}
      right={
        <IconButton
          name={review.isSaved ? 'bookmark' : 'bookmark-outline'}
          label={copy.common.save}
          onPress={() => review.requireAccount('save', '/itinerary')}
        />
      }
      footer={
        <Row>
          <View style={ui.flex}>
            <Txt variant="caption" style={ui.muted}>
              {copy.itinerary.priceLabel}
            </Txt>
            <Txt variant="heading">{money(quote.perGuest)}</Txt>
          </View>
          <Button icon="arrow-forward" onPress={() => router.push('/customize')}>
            {copy.itinerary.book}
          </Button>
        </Row>
      }
    >
      <View>
        <Image source={assets.sea} contentFit="cover" style={{ width: '100%', height: 260 }} />
        <View style={{ position: 'absolute', bottom: s.lg, left: s.lg }}>
          <Badge tone="sun" icon="location-outline">
            {copy.common.destination}
          </Badge>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, gap: s.xl }}>
        <Row style={{ flexWrap: 'wrap' }}>
          <Badge icon="checkmark-circle-outline">{copy.itinerary.genuine}</Badge>
          <Badge tone="sun">{copy.itinerary.theme}</Badge>
        </Row>
        <View style={{ gap: s.md }}>
          <Txt variant="title">{copy.itinerary.title}</Txt>
          <Txt variant="small" style={ui.muted}>
            {copy.itinerary.body}
          </Txt>
          <Row style={{ flexWrap: 'wrap' }}>
            <Row style={{ gap: s.xs }}>
              <Icon name="calendar-outline" size={16} />
              <Txt variant="caption">{copy.common.duration}</Txt>
            </Row>
            <Row style={{ gap: s.xs }}>
              <Icon name="people-outline" size={16} />
              <Txt variant="caption">
                {review.selection.guests} {copy.booking.guestsUnit}
              </Txt>
            </Row>
          </Row>
        </View>
        <Row>
          <View
            style={{
              width: 40,
              height: 40,
              backgroundColor: c.sunSoft,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt variant="label">{copy.feed.initials}</Txt>
          </View>
          <View style={ui.flex}>
            <Txt variant="label">{copy.feed.creator}</Txt>
            <Txt variant="caption" style={ui.muted}>
              {copy.itinerary.creatorNote}
            </Txt>
          </View>
          <Icon name="checkmark-circle" color={c.tealInk} />
        </Row>
        <Segments
          options={[copy.itinerary.plan, copy.itinerary.cost, copy.itinerary.reviews]}
          selected={tab}
          onSelect={setTab}
        />
        {tab === 0 ? (
          <>
            <Row style={{ flexWrap: 'wrap' }}>
              {days.map((_, index) => (
                <Chip key={index} selected={day === index} onPress={() => setDay(index)}>
                  {copy.itinerary.day} {index + 1}
                </Chip>
              ))}
            </Row>
            <Txt variant="heading">{days[day]!.title}</Txt>
            {days[day]!.stops.map((stop, index) => (
              <View key={stop.title} style={{ flexDirection: 'row', gap: s.md }}>
                <View style={{ alignItems: 'center', gap: s.sm }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      backgroundColor: c.seaMist,
                      borderRadius: 17,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={stop.icon} size={18} color={c.tealInk} />
                  </View>
                  {index < days[day]!.stops.length - 1 && (
                    <View style={{ width: 1, flex: 1, minHeight: 30, backgroundColor: c.border }} />
                  )}
                </View>
                <View style={{ flex: 1, paddingBottom: s.lg, gap: s.sm }}>
                  <Txt variant="label">{stop.title}</Txt>
                  <Txt variant="small" style={ui.muted}>
                    {stop.body}
                  </Txt>
                  {stop.icon === 'bed-outline' && (
                    <Pressable accessibilityRole="button" onPress={() => router.push('/hotel')}>
                      <Image source={assets.hotel} style={{ width: '100%', height: 130, borderRadius: 12 }} />
                      <Txt variant="small" style={{ color: c.tealInk, paddingVertical: s.sm }}>
                        {copy.hotel.title} →
                      </Txt>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </>
        ) : tab === 1 ? (
          <Card>
            <PriceRow label={copy.booking.accommodation} amount={money(quote.accommodation)} />
            <PriceRow label={copy.booking.flights} amount={money(quote.flights)} />
            <PriceRow label={copy.common.taxes} amount={copy.common.included} />
            <PriceRow total label={copy.common.total} amount={money(quote.total)} />
            <Notice tone="warning">{copy.booking.selfFunded}</Notice>
          </Card>
        ) : (
          <Card>
            <Row>
              {Array.from({ length: 5 }, (_, index) => (
                <Icon key={index} name="star" color={c.sun} size={18} />
              ))}
            </Row>
            <Txt variant="small">{copy.itinerary.reviewsBody}</Txt>
            <Txt variant="caption" style={ui.muted}>
              {copy.itinerary.reviewAuthor}
            </Txt>
          </Card>
        )}
        <Notice>{copy.itinerary.scope}</Notice>
      </View>
    </Screen>
  );
}

export function HotelScreen() {
  const review = useReview();
  const quote = calculateTripQuote(review.selection);
  return (
    <Screen
      title={copy.hotel.title}
      padded={false}
      footer={
        <Row>
          <View style={ui.flex}>
            <Txt variant="caption" style={ui.muted}>
              {copy.hotel.twoNights}
            </Txt>
            <Txt variant="heading">{money(2_980_000)}</Txt>
          </View>
          <Button icon="arrow-forward" onPress={() => router.push('/customize')}>
            {copy.hotel.select}
          </Button>
        </Row>
      }
    >
      <Image source={assets.hotel} contentFit="cover" style={{ width: '100%', height: 280 }} />
      <View style={{ paddingHorizontal: 20, gap: s.xl }}>
        <Badge icon="location-outline">{copy.hotel.location}</Badge>
        <View style={{ gap: s.sm }}>
          <Txt variant="title">{copy.common.hotelName}</Txt>
          <Txt variant="small" style={ui.muted}>
            {copy.hotel.body}
          </Txt>
          <Row>
            <Icon name="star" color={c.sun} size={18} />
            <Txt variant="small">{copy.hotel.rating}</Txt>
          </Row>
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          {[
            { icon: 'wifi-outline' as const, label: copy.hotel.wifi },
            { icon: 'water-outline' as const, label: copy.hotel.pool },
            { icon: 'cafe-outline' as const, label: copy.hotel.breakfast },
          ].map((amenity) => (
            <View key={amenity.label} style={{ alignItems: 'center', gap: s.sm }}>
              <Icon name={amenity.icon} color={c.tealInk} />
              <Txt variant="small">{amenity.label}</Txt>
            </View>
          ))}
        </Row>
        <Txt variant="heading">{copy.hotel.roomTitle}</Txt>
        <Card>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Txt variant="label">{copy.hotel.room}</Txt>
            <Badge>{copy.hotel.available}</Badge>
          </Row>
          <Txt variant="small" style={ui.muted}>
            {copy.hotel.roomBody}
          </Txt>
          <Txt variant="small">
            {formatDate(review.selection.date)} → {formatDate(shiftTripDate(review.selection.date, 2))}
          </Txt>
          <PriceRow
            label={`${quote.rooms} ${copy.booking.roomUnit} · ${copy.booking.nights}`}
            amount={`${money(1_490_000)} ${copy.common.perNight}`}
          />
        </Card>
        <Txt variant="heading">{copy.hotel.policyTitle}</Txt>
        <Notice>{copy.hotel.policy}</Notice>
        <Txt variant="caption" style={ui.muted}>
          {copy.common.source}
        </Txt>
      </View>
    </Screen>
  );
}
