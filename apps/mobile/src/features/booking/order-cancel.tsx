import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commerceApi, createCancelPaidOperation } from '@tripflix/api-client';
import type { CheckoutDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, formatDate, Icon, money, Notice, PriceRow, Screen, Txt, ui } from '@/components/mobile-ui';
import { CommerceError } from './commerce-state';

const text = vi.commerce;

/** Huỷ đơn đã thanh toán: xem trước phí và số tiền hoàn, xác nhận rồi mới huỷ (giống web). */
export function CancelOrder({ orderId }: { orderId: string }) {
  const client = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  // Giữ một operation để bấm lại sau lỗi mạng gửi đúng Idempotency-Key cũ, không hoàn hai lần.
  const [cancelPaid] = useState(createCancelPaidOperation);
  const quote = useQuery({
    queryKey: ['commerce', 'cancel-quote', orderId],
    enabled: isOpen,
    gcTime: 0,
    queryFn: ({ signal }) => commerceApi.getCancelQuote(orderId, signal),
  });
  const cancel = useMutation({
    retry: false,
    mutationFn: () => cancelPaid(orderId),
    onSuccess: () => {
      // Key đơn trên app có user id ở giữa nên làm mới cả nhóm đơn, để màn hình chuyển ngay sang "Đơn đã huỷ".
      void client.invalidateQueries({ queryKey: ['commerce', 'order'] });
      void client.invalidateQueries({ queryKey: ['commerce', 'trips'] });
    },
  });

  if (!isOpen)
    return (
      <Button tone="text" onPress={() => setIsOpen(true)}>
        {text.cancelOrder}
      </Button>
    );

  const details = quote.data?.quote;
  return (
    <Card>
      <Txt variant="heading">{text.cancelTitle}</Txt>
      {quote.isPending && <Txt>{vi.api.loading}</Txt>}
      <CommerceError error={quote.error} retry={() => void quote.refetch()} />
      {details && !details.isCancellable && <Notice tone="warning">{text.cancelBlocked}</Notice>}
      {details?.isCancellable && (
        <>
          <PriceRow label={text.cancelFeeLabel} amount={money(details.feeAmount)} />
          <PriceRow total label={text.cancelRefundLabel} amount={money(details.refundAmount)} />
          <Txt variant="small" style={ui.muted}>
            {text.cancelNote}
          </Txt>
        </>
      )}
      <CommerceError error={cancel.error} />
      {details?.isCancellable && (
        <Button onPress={() => cancel.mutate()} disabled={cancel.isPending}>
          {cancel.isPending ? vi.api.loading : text.cancelConfirm}
        </Button>
      )}
      <Button tone="secondary" onPress={() => setIsOpen(false)} disabled={cancel.isPending}>
        {text.cancelKeep}
      </Button>
    </Card>
  );
}

/** Màn đơn đã thanh toán rồi huỷ: khác hẳn màn "Đã thanh toán", có tiến trình hoàn tiền. */
export function OrderCancelledScreen({ order }: { order: CheckoutDto }) {
  const refund = order.refund ?? null;
  const step = refund?.status === 'refunded' ? 2 : refund ? 1 : 0;
  const steps = [text.refundSteps.cancelled, text.refundSteps.processing, text.refundSteps.refunded];
  return (
    <Screen title={text.cancelledTitle} back={false}>
      <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md }}>
        {/* Vòng xám nhiều lớp như web để khác hẳn dấu tích xanh của đơn đã thanh toán. */}
        <View style={{ padding: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted }}>
          <View style={{ padding: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.border }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.textMuted,
              }}
            >
              <Icon name="close" size={38} color={colors.background} />
            </View>
          </View>
        </View>
        <Txt variant="title" style={ui.center}>
          {text.cancelledTitle}
        </Txt>
        <Txt style={[ui.center, ui.muted]}>{text.cancelledBody}</Txt>
        {order.confirmationCode && (
          <View
            style={{
              alignItems: 'center',
              gap: spacing.xs,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: colors.textMuted,
              borderRadius: radius.sm,
              backgroundColor: colors.background,
            }}
          >
            <Txt variant="small" style={ui.muted}>
              {text.cancelledCode}
            </Txt>
            <Txt
              style={{
                fontSize: 22,
                fontWeight: '800',
                letterSpacing: 2,
                color: colors.textMuted,
                textDecorationLine: 'line-through',
              }}
            >
              {order.confirmationCode}
            </Txt>
          </View>
        )}
        {order.cancelledAt && (
          <Txt variant="small" style={ui.muted}>
            {text.cancelledAt}{' '}
            {new Date(order.cancelledAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
          </Txt>
        )}
      </View>
      <Card>
        <Txt variant="heading">{text.refundTitle}</Txt>
        {refund ? (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {steps.map((label, index) => {
                const state = index < step ? 'done' : index === step ? 'current' : 'todo';
                return (
                  <View
                    key={label}
                    style={{
                      flex: 1,
                      paddingTop: spacing.sm,
                      borderTopWidth: 4,
                      borderTopColor:
                        state === 'done' ? colors.teal : state === 'current' ? colors.coralInk : colors.border,
                    }}
                  >
                    <Txt
                      variant="small"
                      style={[
                        ui.center,
                        state === 'done'
                          ? { color: colors.tealInk }
                          : state === 'current'
                            ? { color: colors.ink, fontWeight: '700' }
                            : ui.muted,
                      ]}
                    >
                      {label}
                    </Txt>
                  </View>
                );
              })}
            </View>
            <PriceRow label={text.refundPaid} amount={money(order.total)} />
            <PriceRow label={text.refundFee} amount={money(refund.feeAmount)} />
            <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.border }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Txt variant="heading">{text.refundAmount}</Txt>
              <Txt variant="heading" style={{ color: colors.tealInk }}>
                {money(refund.amount)}
              </Txt>
            </View>
            <PriceRow
              label={text.refundMethod}
              amount={text.refundMethods[refund.method as keyof typeof text.refundMethods] ?? refund.method}
            />
            {refund.bankCode && <PriceRow label={text.refundBank} amount={refund.bankCode} />}
            {refund.refundedAt && (
              <PriceRow label={text.refundDoneAt} amount={formatDate(refund.refundedAt.slice(0, 10))} />
            )}
            <Notice>
              {text.cancelRefundStatus[refund.status as keyof typeof text.cancelRefundStatus]}
              {refund.status === 'processing' && ` ${text.refundEta}`}
            </Notice>
          </>
        ) : (
          <Txt style={ui.muted}>{text.cancelNoRefund}</Txt>
        )}
      </Card>
      {/* Làm nhạt mục đã đặt để không nhầm với đơn còn hiệu lực. */}
      <Card>
        <View style={{ gap: spacing.sm, opacity: 0.55 }}>
          {order.items.map((item) => (
            <View key={item.id} style={{ gap: spacing.xs }}>
              <Txt variant="heading">{item.productName}</Txt>
              <Txt variant="small" style={ui.muted}>
                {item.productType === 'flight'
                  ? vi.flights.date + ' · ' + formatDate(item.date)
                  : formatDate(item.date) + ' → ' + formatDate(item.dateTo)}
              </Txt>
              <Txt variant="small" style={ui.muted}>
                {item.qty} × {item.ratePlanName}
              </Txt>
            </View>
          ))}
          <PriceRow label={text.total} amount={money(order.total)} />
        </View>
      </Card>
      <Button icon="arrow-forward" onPress={() => router.replace('/(tabs)/trips')}>
        {text.viewTrips}
      </Button>
      <Button tone="secondary" onPress={() => router.replace('/search')}>
        {text.bookAgain}
      </Button>
    </Screen>
  );
}
