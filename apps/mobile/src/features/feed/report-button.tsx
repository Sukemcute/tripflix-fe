import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import type { ReportDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Field, IconButton, Notice, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';
import { BottomSheet } from '@/components/bottom-sheet';

const copy = vi.moderation;
const reasons = Object.keys(copy.reasons) as ReportDto['reasonCode'][];
export function ReportButton({
  targetType,
  targetId,
  compact = false,
  trigger,
}: {
  targetType: 'post' | 'comment';
  targetId: string;
  /** Chỉ hiện icon cờ, cùng kiểu nút icon trên header. */
  compact?: boolean;
  /** Tự vẽ nút mở, để khớp với các nút xung quanh (ví dụ cột nút trên reels). */
  trigger?: (open: () => void) => ReactNode;
}) {
  const { user } = useApiSession();
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<ReportDto['reasonCode'] | null>(null);
  const [note, setNote] = useState('');
  const report = useMutation({
    mutationFn: () =>
      moderationApi.report(targetType, targetId, {
        reasonCode: reason!,
        reasonDetail: note.trim() || undefined,
      }),
  });
  const open = () => {
    if (!user) {
      router.push({ pathname: '/login', params: { returnTo: '/(tabs)' } });
      return;
    }
    report.reset();
    setReason(null);
    setNote('');
    setVisible(true);
  };
  const close = () => {
    if (!report.isPending) setVisible(false);
  };
  return (
    <>
      {trigger ? (
        trigger(open)
      ) : compact ? (
        <IconButton name="flag-outline" label={copy.reportTitle} onPress={open} />
      ) : (
        <Button tone="text" onPress={open}>
          {copy.reportTitle}
        </Button>
      )}
      <BottomSheet
        visible={visible}
        title={copy.reportTitle}
        onClose={close}
        footer={
          report.isSuccess ? (
            <Button tone="secondary" onPress={close}>
              {vi.api.close}
            </Button>
          ) : (
            <Button disabled={!reason || report.isPending} onPress={() => report.mutate()}>
              {report.isPending ? vi.api.loading : copy.reportTitle}
            </Button>
          )
        }
      >
        <View style={styles.content}>
          {report.isSuccess ? (
            <Notice>{copy.reported}</Notice>
          ) : (
            <>
              <Txt>{copy.reportHint}</Txt>
              {reasons.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: reason === value, disabled: report.isPending }}
                  disabled={report.isPending}
                  onPress={() => setReason(value)}
                  style={[styles.reason, reason === value && styles.selected]}
                >
                  <Txt>{copy.reasons[value]}</Txt>
                </Pressable>
              ))}
              <Field
                label={copy.note}
                value={note}
                onChangeText={setNote}
                maxLength={500}
                multiline
                editable={!report.isPending}
              />
              <ApiErrorNotice error={report.error} />
            </>
          )}
        </View>
      </BottomSheet>
    </>
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.md },
  reason: {
    minHeight: 44,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  selected: { borderColor: colors.tealInk, backgroundColor: colors.seaMist },
});
