import { TRIP_PLAN_CATEGORIES, TRIP_PLAN_TIME_PATTERN, type TripPlanCategory } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { compactType } from '@/components/mobile-scale';
import { Field, Icon, IconButton, Row, Txt, ui, type IconName } from '@/components/mobile-ui';
import { ChoiceChip } from './trip-plan-parts';

const copy = vi.mobile.tripBuilder;

export type ActivityCategory = TripPlanCategory;
/** Phần sửa được của một hoạt động hay gợi ý (cà phê, ăn uống, vui chơi…): không đặt chỗ, không tính tiền. */
export interface ActivityFields {
  key: string;
  time: string;
  title: string;
  category: ActivityCategory;
  /** Địa điểm, mẹo từ bài đăng: hiện dưới tên khi có. */
  detail?: string;
}

export const ACTIVITY_CATEGORIES = TRIP_PLAN_CATEGORIES;
/** Icon của từng loại hoạt động, gợi ý; dùng chung ở mọi màn lộ trình. */
export const ACTIVITY_ICONS: Record<ActivityCategory, IconName> = {
  cafe: 'cafe-outline',
  food: 'restaurant-outline',
  fun: 'happy-outline',
  other: 'location-outline',
};

/** Cột giờ bên trái mỗi thẻ; hoạt động chưa có giờ thì hiện nút thêm giờ. */
export function TimeTag({ time, onAdd }: { time: string; onAdd?: () => void }) {
  const hasTime = TRIP_PLAN_TIME_PATTERN.test(time);
  if (!hasTime && onAdd) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.addTime}
        onPress={onAdd}
        style={({ pressed }) => [styles.timeTag, styles.addTime, pressed && styles.pressed]}
      >
        <Icon name="time-outline" size={14} color={x.day.link} />
        <Txt style={styles.addTimeText}>{copy.addTimeShort}</Txt>
      </Pressable>
    );
  }
  return (
    <Pressable disabled={!onAdd} onPress={onAdd} style={styles.timeTag}>
      <Txt style={styles.timeText}>{hasTime ? time : '--:--'}</Txt>
    </Pressable>
  );
}

/**
 * Thẻ hoạt động dùng ở Tự lên lộ trình và phần gợi ý của Đặt theo lộ trình: bấm giữ ≡ để kéo,
 * bấm vào để sửa loại, giờ, tên.
 */
export function ActivityCard({
  item,
  handle,
  isOpen,
  onToggle,
  onChange,
  onRemove,
}: {
  item: ActivityFields;
  handle: (child: ReactNode) => ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ActivityFields>) => void;
  onRemove: () => void;
}) {
  const isTimeInvalid = !!item.time && !TRIP_PLAN_TIME_PATTERN.test(item.time);
  return (
    <View style={[styles.activity, isOpen && styles.activityOpen]}>
      {handle(
        <View style={styles.activityHead} accessibilityHint={vi.mobile.tripPlan.editor.dragHint}>
          <Icon name="reorder-three" size={22} color={x.day.textSecondary} />
          <Pressable accessibilityRole="button" onPress={onToggle} style={[ui.flex, styles.activityBody]}>
            <View style={styles.activityIcon}>
              <Icon name={ACTIVITY_ICONS[item.category]} size={18} color={x.day.text} />
            </View>
            <View style={ui.flex}>
              <Txt style={styles.activityTitle} numberOfLines={2}>
                {item.title.trim() || copy.newActivity}
              </Txt>
              <Txt style={styles.muted} numberOfLines={2}>
                {item.detail || copy.activityKinds[item.category]}
              </Txt>
            </View>
          </Pressable>
          <IconButton name="close" label={copy.removeActivity} onPress={onRemove} />
        </View>,
      )}
      {isOpen && (
        <View style={styles.activityForm}>
          <Row style={styles.chips}>
            {ACTIVITY_CATEGORIES.map((category) => (
              <ChoiceChip
                key={category}
                label={copy.activityKinds[category]}
                isSelected={item.category === category}
                onPress={() => onChange({ category })}
              />
            ))}
          </Row>
          <Row style={styles.activityFields}>
            <View style={styles.timeField}>
              <Field
                compact
                label={copy.activityTime}
                placeholder="HH:mm"
                value={item.time}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
                error={isTimeInvalid ? copy.timeInvalid : undefined}
                onChangeText={(time) => onChange({ time })}
              />
            </View>
            <View style={ui.flex}>
              <Field
                compact
                label={copy.activityName}
                placeholder={copy.activityPlaceholder}
                value={item.title}
                maxLength={120}
                onChangeText={(title) => onChange({ title })}
              />
            </View>
          </Row>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  muted: { ...compactType.body, fontFamily: nativeFonts.regular, color: x.day.textSecondary },
  chips: { alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  timeTag: { width: 48, paddingTop: spacing.md, alignItems: 'center' },
  timeText: { ...compactType.label, fontFamily: nativeFonts.semibold, color: x.day.text },
  addTime: {
    flexDirection: 'row',
    gap: 2,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: x.day.link,
    justifyContent: 'center',
  },
  addTimeText: { ...compactType.label, fontFamily: nativeFonts.semibold, color: x.day.link },
  activity: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  activityOpen: { borderColor: x.day.link },
  activityHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm },
  activityBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.day.canvas,
  },
  activityTitle: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: x.day.text },
  activityForm: { gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  activityFields: { gap: spacing.sm, alignItems: 'flex-start' },
  timeField: { width: 88 },
});
