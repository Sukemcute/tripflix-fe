import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import type { ReportDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Icon, Notice, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';

const copy = vi.moderation;
const reasons = Object.keys(copy.reasons) as ReportDto['reasonCode'][];
export function ReportButton({
  targetType,
  targetId,
  compact = false,
}: {
  targetType: 'post' | 'comment';
  targetId: string;
  compact?: boolean;
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
      {compact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.reportTitle}
          onPress={open}
          style={styles.trigger}
        >
          <Icon name="flag-outline" size={26} color={colors.background} />
        </Pressable>
      ) : (
        <Button tone="text" onPress={open}>
          {copy.reportTitle}
        </Button>
      )}
      <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
        <View style={styles.backdrop}>
          <SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <Txt variant="heading">{copy.reportTitle}</Txt>
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
                  <Button disabled={!reason || report.isPending} onPress={() => report.mutate()}>
                    {report.isPending ? vi.api.loading : copy.reportTitle}
                  </Button>
                </>
              )}
              <Button tone="secondary" disabled={report.isPending} onPress={close}>
                {vi.api.close}
              </Button>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  trigger: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlayHeavy },
  sheet: {
    backgroundColor: colors.background,
    maxHeight: '90%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  reason: {
    minHeight: 44,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  selected: { borderColor: colors.tealInk, backgroundColor: colors.seaMist },
});
