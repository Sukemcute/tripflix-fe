import { shiftTripDate } from '@tripflix/app-core';
import { colors as c, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  assets,
  Badge,
  Button,
  Card,
  copy,
  Empty,
  formatDate,
  Icon,
  IconButton,
  money,
  Notice,
  PriceRow,
  Row,
  Screen,
  Segments,
  Sheet,
  Txt,
  ui,
  type IconName,
} from '@/components/mobile-ui';
import { TripCard } from '@/features/discovery/trip-card';
import { useReview } from '@/features/review/review-provider';

export function TripsScreen() {
  const review = useReview();
  const params = useLocalSearchParams<{ scenario?: string }>();
  const [tab, setTab] = useState(0);
  const [hasDetails, setDetails] = useState(false);
  const order = review.order;
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
        <Txt variant="title">{copy.trips.title}</Txt>
        <Txt variant="small" style={ui.muted}>
          {copy.trips.body}
        </Txt>
      </View>
      <Segments
        options={[copy.trips.upcoming, copy.trips.completed, copy.trips.cancelled]}
        selected={tab}
        onSelect={setTab}
      />
      {tab === 0 ? (
        order && params.scenario !== 'empty' ? (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <Image source={assets.sea} style={{ width: '100%', height: 180 }} />
            <View style={{ padding: s.lg, gap: s.md }}>
              <Badge icon="checkmark-circle-outline">{copy.booking.confirmed}</Badge>
              <Txt variant="heading">{copy.common.tripName}</Txt>
              <Txt variant="small" style={ui.muted}>
                {formatDate(order.date)} → {formatDate(shiftTripDate(order.date, 2))} · {order.guests}{' '}
                {copy.booking.guestsUnit}
              </Txt>
              <PriceRow label={copy.common.total} amount={money(order.total)} />
              <Button tone="secondary" icon="arrow-forward" onPress={() => setDetails(true)}>
                {copy.trips.viewOrder}
              </Button>
            </View>
          </Card>
        ) : (
          <Empty
            title={copy.trips.emptyTitle}
            body={copy.trips.emptyBody}
            action={copy.trips.find}
            onAction={() => router.push('/(tabs)')}
          />
        )
      ) : tab === 1 ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Image source={assets.hoiAn} style={{ width: '100%', height: 180 }} />
          <View style={{ padding: s.lg, gap: s.md }}>
            <Badge>{copy.trips.completedBadge}</Badge>
            <Txt variant="heading">{copy.common.hoiAn}</Txt>
            <Txt variant="small" style={ui.muted}>
              {copy.trips.completedDate}
            </Txt>
            <Button
              tone="teal"
              icon="create-outline"
              onPress={() => review.requireAccount('create', '/my-trips')}
            >
              {copy.trips.tellStory}
            </Button>
          </View>
        </Card>
      ) : (
        <Empty title={copy.trips.cancelledTitle} body={copy.trips.cancelledBody} />
      )}
      <Sheet title={copy.trips.order} visible={hasDetails} onClose={() => setDetails(false)}>
        {order && (
          <>
            <Badge>{copy.booking.confirmed}</Badge>
            <Txt variant="heading">{copy.common.tripName}</Txt>
            <Txt variant="small">
              {formatDate(order.date)} → {formatDate(shiftTripDate(order.date, 2))}
            </Txt>
            <Txt variant="small">
              {order.guests} {copy.booking.guestsUnit} · {order.rooms} {copy.booking.roomUnit} ·{' '}
              {copy.booking.nights}
            </Txt>
            <Txt variant="small">{order.hasFlight ? copy.explore.package : copy.booking.noFlight}</Txt>
            <PriceRow label={copy.booking.referenceCode} amount={copy.booking.code} />
            <PriceRow label={copy.booking.paidTotal} amount={money(order.total)} />
            <Notice>{copy.hotel.policy}</Notice>
          </>
        )}
      </Sheet>
    </Screen>
  );
}

export function ProfileScreen() {
  const review = useReview();
  const [sheet, setSheet] = useState<'help' | 'settings' | null>(null);
  const menus: { label: string; icon: IconName; action: () => void }[] = [
    { label: copy.profile.myTrips, icon: 'bag-handle-outline', action: () => router.push('/my-trips') },
    { label: copy.profile.savedTrips, icon: 'bookmark-outline', action: () => router.push('/saved') },
    {
      label: copy.profile.create,
      icon: 'create-outline',
      action: () => review.requireAccount('create', '/(tabs)/me'),
    },
    {
      label: copy.common.notification,
      icon: 'notifications-outline',
      action: () => router.push('/notifications'),
    },
    { label: copy.profile.help, icon: 'help-buoy-outline', action: () => setSheet('help') },
  ];
  return (
    <Screen
      back={false}
      right={
        <IconButton
          name="settings-outline"
          label={copy.profile.settings}
          onPress={() => setSheet('settings')}
        />
      }
    >
      <View style={{ backgroundColor: c.seaMist, borderRadius: 24, padding: s.xl, gap: s.lg }}>
        <View
          style={{
            height: 76,
            width: 76,
            borderRadius: 38,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.sunSoft,
            borderWidth: 4,
            borderColor: c.background,
          }}
        >
          <Txt variant="title">
            {review.isSignedIn ? copy.profile.initials : copy.common.logo.slice(0, 2)}
          </Txt>
        </View>
        <Txt variant="title">{review.isSignedIn ? copy.profile.member : copy.profile.guest}</Txt>
        <Txt variant="small" style={ui.muted}>
          {review.isSignedIn ? copy.common.demoNotice : copy.profile.body}
        </Txt>
        {!review.isSignedIn && <Button onPress={() => router.push('/login')}>{copy.profile.login}</Button>}
      </View>
      <Row style={{ justifyContent: 'space-around' }}>
        {[
          { count: review.isPostPending ? 1 : 0, label: copy.profile.posts },
          { count: review.order ? 2 : 1, label: copy.profile.trips },
          { count: review.savedTripSlugs.length, label: copy.profile.saved },
        ].map((stat) => (
          <View key={stat.label} style={{ alignItems: 'center', gap: s.xs }}>
            <Txt variant="heading">{stat.count}</Txt>
            <Txt variant="caption" style={ui.muted}>
              {stat.label}
            </Txt>
          </View>
        ))}
      </Row>
      {review.isPostPending && <Notice>{copy.trips.pending}</Notice>}
      {menus.map((menu) => (
        <Pressable
          key={menu.label}
          accessibilityRole="button"
          onPress={menu.action}
          style={[ui.row, { minHeight: 56 }]}
        >
          <View style={{ backgroundColor: c.seaMist, padding: s.md, borderRadius: 12 }}>
            <Icon name={menu.icon} color={c.tealInk} />
          </View>
          <Txt variant="small" style={ui.flex}>
            {menu.label}
          </Txt>
          <Icon name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
      ))}
      <Sheet
        title={sheet === 'settings' ? copy.profile.settings : copy.profile.help}
        visible={!!sheet}
        onClose={() => setSheet(null)}
      >
        <Notice>{copy.profile.helpBody}</Notice>
        {review.isSignedIn && sheet === 'settings' && (
          <Button
            tone="secondary"
            onPress={() => {
              setSheet(null);
              review.signOut();
            }}
          >
            {copy.auth.logout}
          </Button>
        )}
      </Sheet>
    </Screen>
  );
}

export function SavedScreen() {
  const review = useReview();
  const params = useLocalSearchParams<{ scenario?: string }>();
  return (
    <Screen title={copy.profile.savedTrips}>
      <View style={{ gap: s.sm }}>
        <Txt variant="title">{copy.profile.savedTitle}</Txt>
        <Txt variant="small" style={ui.muted}>
          {copy.profile.savedBody}
        </Txt>
      </View>
      {review.savedTripSlugs.length > 0 && params.scenario !== 'empty' ? (
        <>
          {review.savedTripSlugs.map((slug) => (
            <TripCard key={slug} tripSlug={slug} />
          ))}
        </>
      ) : (
        <Empty
          title={copy.profile.emptyTitle}
          body={copy.profile.emptyBody}
          action={copy.trips.find}
          onAction={() => router.push('/(tabs)')}
        />
      )}
    </Screen>
  );
}

export function NotificationsScreen() {
  const review = useReview();
  const [tab, setTab] = useState(0);
  const hasOrders = !!review.order && tab !== 2;
  const hasPost = review.isPostPending && tab !== 1;
  return (
    <Screen title={copy.notifications.title}>
      <Txt variant="title">{copy.notifications.title}</Txt>
      <Segments
        options={[copy.notifications.all, copy.notifications.orders, copy.notifications.interactions]}
        selected={tab}
        onSelect={setTab}
      />
      {hasOrders && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/my-trips')}
          style={[ui.card, ui.row]}
        >
          <Icon name="checkmark-circle-outline" color={c.tealInk} size={32} />
          <View style={ui.flex}>
            <Txt variant="label">{copy.notifications.orderTitle}</Txt>
            <Txt variant="small" style={ui.muted}>
              {copy.notifications.orderBody}
            </Txt>
            <Badge>{copy.common.demo}</Badge>
          </View>
          <Icon name="chevron-forward" size={18} />
        </Pressable>
      )}
      {hasPost && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/me')}
          style={[ui.card, ui.row]}
        >
          <Icon name="create-outline" color={c.tealInk} size={32} />
          <View style={ui.flex}>
            <Txt variant="label">{copy.notifications.postTitle}</Txt>
            <Txt variant="small" style={ui.muted}>
              {copy.notifications.postBody}
            </Txt>
          </View>
        </Pressable>
      )}
      {!hasOrders && !hasPost && (
        <Empty title={copy.notifications.empty} body={copy.notifications.emptyBody} />
      )}
    </Screen>
  );
}
