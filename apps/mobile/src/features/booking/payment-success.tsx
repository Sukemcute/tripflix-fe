import type { CheckoutDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { View } from 'react-native';
import {
  Button,
  Card,
  formatDate,
  Icon,
  Mascot,
  money,
  PriceRow,
  Screen,
  Txt,
  ui,
} from '@/components/mobile-ui';

const text = vi.commerce;
export function PaymentSuccessScreen({ order }: { order: CheckoutDto }) {
  return (
    <Screen title={text.paid} back={false}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <View>
          <Mascot pose="celebrate" size={148} />
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              padding: spacing.xs,
              borderRadius: radius.pill,
              backgroundColor: colors.seaMist,
            }}
          >
            <Icon name="checkmark-circle" size={32} color={colors.tealInk} />
          </View>
        </View>
        <Txt variant="title" style={ui.center}>
          {text.paymentSucceeded}
        </Txt>
        <Txt style={[ui.center, ui.muted]}>{text.paymentSuccessBody}</Txt>
      </View>
      <Card>
        {order.items.map((item) => (
          <View key={item.id} style={{ gap: spacing.sm }}>
            <Txt variant="heading">{item.productName}</Txt>
            <Txt>
              {formatDate(item.date)} → {formatDate(item.dateTo)}
            </Txt>
            <Txt variant="small" style={ui.muted}>
              {item.qty} × {item.ratePlanName}
            </Txt>
          </View>
        ))}
        {order.confirmationCode && <PriceRow label={text.confirmation} amount={order.confirmationCode} />}
        <PriceRow total label={text.paidAmount} amount={money(order.total)} />
      </Card>
      <Button icon="arrow-forward" onPress={() => router.replace('/(tabs)/trips')}>
        {text.viewTrips}
      </Button>
      <Button
        tone="secondary"
        onPress={() => router.replace({ pathname: '/booking/[id]', params: { id: order.orderId } })}
      >
        {text.detail}
      </Button>
      <Button tone="text" onPress={() => router.replace('/(tabs)/explore')}>
        {text.continueExploring}
      </Button>
    </Screen>
  );
}
