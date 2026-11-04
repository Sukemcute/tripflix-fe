import {
  calculateTripQuote,
  isValidTripDate,
  shiftTripDate,
  validateReviewContact,
} from '@tripflix/app-core';
import { colors as c, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  assets,
  Badge,
  Button,
  Card,
  copy,
  Field,
  formatDate,
  Icon,
  IconButton,
  Mascot,
  money,
  Notice,
  PriceRow,
  Row,
  Screen,
  Sheet,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { useReview } from '@/features/review/review-provider';
import { LoginScreen } from '@/features/auth/auth-screens';

export function CustomizeScreen() {
  const review = useReview();
  const [hasAttempted, setAttempted] = useState(false);
  const [dateDraft, setDateDraft] = useState(review.selection.date);
  const quote = calculateTripQuote(review.selection);
  const isDateValid = isValidTripDate(dateDraft, review.today);
  function continueToCart() {
    setAttempted(true);
    if (isDateValid) {
      review.setSelection((previous) => ({ ...previous, date: dateDraft }));
      router.push('/cart');
    }
  }
  return (
    <Screen
      title={copy.booking.customize}
      footer={
        <>
          <PriceRow
            label={`${copy.booking.estimated} · ${review.selection.guests} ${copy.booking.guestsUnit}`}
            amount={money(quote.total)}
          />
          <Button icon="arrow-forward" onPress={continueToCart}>
            {copy.booking.viewCart}
          </Button>
        </>
      }
    >
      <Row>
        <Image source={assets.sea} style={{ width: 68, height: 68, borderRadius: 14 }} />
        <View style={ui.flex}>
          <Txt variant="label">{copy.common.tripName}</Txt>
          <Txt variant="caption" style={ui.muted}>
            {copy.common.duration} · {copy.feed.creator}
          </Txt>
        </View>
      </Row>
      <View style={{ gap: s.sm }}>
        <Txt variant="title">{copy.booking.customizeTitle}</Txt>
        <Txt variant="small" style={ui.muted}>
          {copy.booking.customizeBody}
        </Txt>
      </View>
      <Field
        label={copy.booking.date}
        value={dateDraft}
        onChangeText={setDateDraft}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        maxLength={10}
        error={hasAttempted && !isDateValid ? copy.booking.invalidDate : undefined}
      />
      <Notice>
        {copy.booking.dateNotice}
        {isDateValid ? ` ${formatDate(dateDraft)} → ${formatDate(shiftTripDate(dateDraft, 2))}` : ''}
      </Notice>
      <Card>
        <Row>
          <View style={ui.flex}>
            <Txt variant="label">{copy.booking.adults}</Txt>
            <Txt variant="caption" style={ui.muted}>
              {copy.booking.adultsHint}
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.booking.fewer}
            disabled={review.selection.guests <= 1}
            accessibilityState={{ disabled: review.selection.guests <= 1 }}
            onPress={() =>
              review.setSelection((previous) => ({ ...previous, guests: Math.max(1, previous.guests - 1) }))
            }
            style={[ui.iconButton, ui.secondary, review.selection.guests <= 1 && ui.disabled]}
          >
            <Icon name="remove" />
          </Pressable>
          <Txt variant="heading" accessibilityLiveRegion="polite">
            {review.selection.guests}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.booking.more}
            disabled={review.selection.guests >= 8}
            accessibilityState={{ disabled: review.selection.guests >= 8 }}
            onPress={() =>
              review.setSelection((previous) => ({ ...previous, guests: Math.min(8, previous.guests + 1) }))
            }
            style={[ui.iconButton, ui.secondary, review.selection.guests >= 8 && ui.disabled]}
          >
            <Icon name="add" />
          </Pressable>
        </Row>
      </Card>
      <PriceRow
        label={copy.booking.rooms}
        amount={`${quote.rooms} ${copy.booking.roomUnit} · ${copy.booking.nights}`}
      />
      <Txt variant="heading">{copy.booking.includes}</Txt>
      <PriceRow label={copy.booking.accommodation} amount={money(quote.accommodation)} />
      {review.selection.hasFlight ? (
        <PriceRow label={copy.booking.flights} amount={money(quote.flights)} />
      ) : (
        <Notice>{copy.booking.noFlight}</Notice>
      )}
      <Txt variant="caption" style={ui.muted}>
        {copy.booking.priceNotice}
      </Txt>
    </Screen>
  );
}

export function CartScreen() {
  const review = useReview();
  const params = useLocalSearchParams<{ scenario?: string }>();
  const isUnavailable = params.scenario === 'unavailable';
  const quote = calculateTripQuote(review.selection);
  const isDateValid = isValidTripDate(review.selection.date, review.today);
  return (
    <Screen
      title={copy.booking.cart}
      right={
        <IconButton
          name="create-outline"
          label={copy.common.edit}
          onPress={() => router.push('/customize')}
        />
      }
      footer={
        <>
          <Button
            icon={isUnavailable || !isDateValid ? 'calendar-outline' : 'arrow-forward'}
            onPress={() =>
              isUnavailable || !isDateValid
                ? router.push('/customize')
                : review.requireAccount('checkout', '/cart')
            }
          >
            {isUnavailable || !isDateValid ? copy.booking.changeDate : copy.booking.continue}
          </Button>
          <Txt variant="caption" style={[ui.center, ui.muted]}>
            {copy.booking.oneOrder}
          </Txt>
        </>
      }
    >
      <View style={{ gap: s.sm }}>
        <Txt variant="title">{copy.booking.cartTitle}</Txt>
        <Txt variant="small" style={ui.muted}>
          {formatDate(review.selection.date)} → {formatDate(shiftTripDate(review.selection.date, 2))}
          {'\n'}
          {review.selection.guests} {copy.booking.guestsUnit} · {copy.common.destination}
        </Txt>
      </View>
      {isUnavailable && <Notice tone="error">{copy.booking.unavailable}</Notice>}
      {!isDateValid && <Notice tone="error">{copy.booking.invalidDate}</Notice>}
      <Card>
        <Row>
          <Image source={assets.hotel} style={{ width: 76, height: 76, borderRadius: 12 }} />
          <View style={ui.flex}>
            <Badge>{copy.common.demo}</Badge>
            <Txt variant="label">{copy.common.hotelName}</Txt>
            <Txt variant="caption" style={ui.muted}>
              {copy.hotel.room} · {quote.rooms} {copy.booking.roomUnit} × {copy.booking.nights}
            </Txt>
          </View>
        </Row>
        <Row>
          <Button tone="text" onPress={() => router.push('/hotel')}>
            {copy.booking.policy}
          </Button>
          <View style={ui.flex} />
          <Txt variant="label">{money(quote.accommodation)}</Txt>
        </Row>
      </Card>
      {review.selection.hasFlight ? (
        <Card>
          <Row>
            <Icon name="airplane-outline" color={c.tealInk} size={30} />
            <View style={ui.flex}>
              <Txt variant="label">{copy.booking.flightRoute}</Txt>
              <Txt variant="caption" style={ui.muted}>
                {copy.booking.flightBody} · {review.selection.guests} {copy.booking.guestsUnit}
              </Txt>
            </View>
            <IconButton
              name="trash-outline"
              label={copy.booking.removeFlight}
              onPress={() => review.setSelection((previous) => ({ ...previous, hasFlight: false }))}
            />
          </Row>
          <Txt variant="caption" style={ui.muted}>
            {copy.booking.baggage}
          </Txt>
          <PriceRow label={copy.booking.flights} amount={money(quote.flights)} />
        </Card>
      ) : (
        <>
          <Notice>{copy.booking.noFlight}</Notice>
          <Button
            tone="secondary"
            icon="add"
            onPress={() => review.setSelection((previous) => ({ ...previous, hasFlight: true }))}
          >
            {copy.booking.addFlight}
          </Button>
        </>
      )}
      <Notice tone="warning">{copy.booking.selfFunded}</Notice>
      <View>
        <PriceRow label={copy.booking.accommodation} amount={money(quote.accommodation)} />
        {review.selection.hasFlight && (
          <PriceRow label={copy.booking.flights} amount={money(quote.flights)} />
        )}
        <PriceRow label={copy.common.taxes} amount={copy.common.included} />
        <PriceRow total label={copy.common.total} amount={money(quote.total)} />
        <Txt variant="caption" style={ui.muted}>
          {money(quote.perGuest)} {copy.common.perGuest}
        </Txt>
      </View>
    </Screen>
  );
}

export function CheckoutScreen() {
  const review = useReview();
  const params = useLocalSearchParams<{ scenario?: string }>();
  const [hasAttempted, setAttempted] = useState(false);
  const [isPending, setPending] = useState(false);
  const [hasTerms, setTerms] = useState(false);
  const [hasRecovered, setRecovered] = useState(false);
  const quote = calculateTripQuote(review.selection);
  const validation = validateReviewContact(review.contact);
  const isExpired = params.scenario === 'expired' && !hasRecovered;
  const isFailed = params.scenario === 'failed' && !hasRecovered;
  if (!review.isSignedIn)
    return (
      <LoginScreen
        afterSignIn={() =>
          review.finishSignIn({
            pathname: '/checkout',
            params: params.scenario ? { scenario: params.scenario } : {},
          })
        }
      />
    );
  function submit() {
    setAttempted(true);
    if (isPending) return;
    if (!isValidTripDate(review.selection.date, review.today)) {
      router.replace('/customize');
      return;
    }
    if (isExpired) {
      setRecovered(true);
      router.replace('/cart');
      return;
    }
    if (!Object.values(validation).every(Boolean)) return;
    setPending(true);
    if (isFailed) setRecovered(true);
    if (review.confirmOrder()) router.replace('/success');
    else setPending(false);
  }
  return (
    <Screen
      title={copy.booking.checkout}
      footer={
        <>
          <Button disabled={isPending} icon="lock-closed-outline" onPress={submit}>
            {isPending
              ? copy.booking.confirming
              : isExpired
                ? copy.booking.checkAgain
                : isFailed
                  ? copy.booking.tryPayment
                  : `${copy.booking.pay} ${money(quote.total)}`}
          </Button>
          <Txt variant="caption" style={[ui.center, ui.muted]}>
            {copy.common.demoNotice}
          </Txt>
        </>
      }
    >
      {(isExpired || isFailed) && (
        <Notice tone="error">{isExpired ? copy.booking.expired : copy.booking.failed}</Notice>
      )}
      <Notice>{copy.booking.demoPayment}</Notice>
      <Txt variant="heading">{copy.booking.contact}</Txt>
      <Field
        label={copy.booking.name}
        placeholder={copy.booking.namePlaceholder}
        autoComplete="name"
        value={review.contact.name}
        onChangeText={(name) => review.setContact((previous) => ({ ...previous, name }))}
        error={hasAttempted && !validation.name ? copy.booking.nameError : undefined}
      />
      <Field
        label={copy.booking.email}
        placeholder={copy.booking.emailPlaceholder}
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={review.contact.email}
        onChangeText={(email) => review.setContact((previous) => ({ ...previous, email }))}
        error={hasAttempted && !validation.email ? copy.booking.emailError : undefined}
      />
      <Field
        label={copy.booking.phone}
        placeholder={copy.booking.phonePlaceholder}
        autoComplete="tel"
        keyboardType="phone-pad"
        value={review.contact.phone}
        onChangeText={(phone) => review.setContact((previous) => ({ ...previous, phone }))}
        error={hasAttempted && !validation.phone ? copy.booking.phoneError : undefined}
      />
      <Txt variant="heading">{copy.booking.methods}</Txt>
      {(
        [
          {
            key: 'wallet',
            label: copy.booking.wallet,
            body: copy.booking.walletBody,
            icon: 'wallet-outline',
          },
          { key: 'card', label: copy.booking.card, body: copy.booking.cardBody, icon: 'card-outline' },
        ] as const
      ).map((method) => (
        <Pressable
          key={method.key}
          accessibilityRole="radio"
          accessibilityState={{ checked: review.payment === method.key }}
          onPress={() => review.setPayment(method.key)}
          style={[
            ui.card,
            ui.row,
            review.payment === method.key && { borderColor: c.coral, backgroundColor: c.warmMist },
          ]}
        >
          <Icon name={method.icon} />
          <View style={ui.flex}>
            <Txt variant="label">{method.label}</Txt>
            <Txt variant="caption" style={ui.muted}>
              {method.body}
            </Txt>
          </View>
          <Icon
            name={review.payment === method.key ? 'radio-button-on' : 'radio-button-off'}
            color={review.payment === method.key ? c.coral : c.textMuted}
          />
        </Pressable>
      ))}
      <PriceRow total label={copy.booking.paidTotal} amount={money(quote.total)} />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: review.contact.hasConsent }}
        onPress={() => review.setContact((previous) => ({ ...previous, hasConsent: !previous.hasConsent }))}
        style={[ui.row, { alignItems: 'flex-start', minHeight: 44 }]}
      >
        <Icon
          name={review.contact.hasConsent ? 'checkbox' : 'square-outline'}
          color={review.contact.hasConsent ? c.tealInk : c.textMuted}
        />
        <Txt variant="small" style={ui.flex}>
          {copy.booking.consent}
        </Txt>
      </Pressable>
      {hasAttempted && !validation.hasConsent && (
        <Txt accessibilityRole="alert" variant="small" style={{ color: c.coralInk }}>
          {copy.booking.consentError}
        </Txt>
      )}
      <Button tone="text" onPress={() => setTerms(true)}>
        {copy.booking.terms}
      </Button>
      <Sheet title={copy.booking.terms} visible={hasTerms} onClose={() => setTerms(false)}>
        <Notice tone="warning">{copy.common.demo}</Notice>
        <Txt variant="small">{copy.hotel.policy}</Txt>
        <Txt variant="small">{copy.booking.baggage}</Txt>
        <Txt variant="small">{copy.booking.selfFunded}</Txt>
      </Sheet>
    </Screen>
  );
}

export function SuccessScreen() {
  const { order } = useReview();
  if (!order) return <Redirect href="/(tabs)/trips" />;
  return (
    <Screen
      back={false}
      footer={
        <>
          <Button icon="arrow-forward" onPress={() => router.replace('/(tabs)/trips')}>
            {copy.booking.viewTrips}
          </Button>
          <Button tone="text" onPress={() => router.replace('/(tabs)/explore')}>
            {copy.booking.exploreMore}
          </Button>
        </>
      }
    >
      <View style={{ alignItems: 'center', gap: s.lg }}>
        <Mascot pose="celebrate" size={180} />
        <Badge icon="checkmark-circle-outline">{copy.booking.confirmed}</Badge>
        <Txt variant="title" style={ui.center}>
          {copy.booking.successTitle}
        </Txt>
        <Txt variant="small" style={[ui.muted, ui.center]}>
          {copy.booking.successBody}
        </Txt>
      </View>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Image source={assets.sea} style={{ width: '100%', height: 140 }} />
        <View style={{ padding: s.lg, gap: s.md }}>
          <Txt variant="heading">{copy.common.tripName}</Txt>
          <Txt variant="small" style={ui.muted}>
            {formatDate(order.date)} · {copy.common.duration}
          </Txt>
          <PriceRow label={copy.booking.paidTotal} amount={money(order.total)} />
          <PriceRow label={copy.booking.referenceCode} amount={copy.booking.code} />
        </View>
      </Card>
      <Notice>{copy.booking.emailNotice}</Notice>
    </Screen>
  );
}
