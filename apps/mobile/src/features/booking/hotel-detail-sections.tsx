import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getHotelReviews,
  useApiSession,
  type CommerceHotel,
  type HotelReviewFilters,
} from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts, spacing } from '@tripflix/tokens';
import { Pressable, ScrollView, View } from 'react-native';
import { Icon, type IconName, money, Row, Txt } from '@/components/mobile-ui';
import { typeStyle } from '@/components/type-scale';
import { CommerceError } from './commerce-state';

const radius = x.radius;
const copy = vi.hotel;
const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;
const hasValue = (value: unknown) => value !== null && value !== undefined && value !== '';
const COLLAPSED_AMENITY_GROUPS = 2;
const REVIEW_PAGE_SIZE = 3;

// Tên biểu tượng của web (HotelIcon) đổi sang Ionicons; tên lạ dùng biểu tượng chung.
const ICONS: Record<string, IconName> = {
  wifi: 'wifi-outline',
  pool: 'water-outline',
  gym: 'barbell-outline',
  spa: 'flower-outline',
  restaurant: 'restaurant-outline',
  bar: 'wine-outline',
  parking: 'car-outline',
  'airport-shuttle': 'airplane-outline',
  shuttle: 'bus-outline',
  business: 'briefcase-outline',
  kids: 'happy-outline',
  crib: 'bed-outline',
  'high-chair': 'happy-outline',
  'ev-charger': 'flash-outline',
  'fire-alarm': 'alert-circle-outline',
  beach: 'umbrella-outline',
  location: 'location-outline',
  view: 'image-outline',
  breakfast: 'cafe-outline',
  family: 'people-outline',
  pet: 'paw-outline',
  check: 'checkmark-circle-outline',
};
const POLICY_ICONS: Record<string, IconName> = {
  child: 'people-outline',
  extraBed: 'bed-outline',
  deposit: 'card-outline',
  depositAmount: 'cash-outline',
  stay: 'moon-outline',
};
const iconOf = (name?: string | null): IconName => (name && ICONS[name]) || 'sparkles-outline';

/** Cỡ chữ dùng chung cho cả màn chi tiết: tiêu đề mục, chữ thường, chữ đậm, chữ phụ. */
const T = {
  title: { ...typeStyle('headline'), fontFamily: nativeFonts.bold, color: x.day.text },
  body: { ...typeStyle('label'), lineHeight: 22, fontFamily: nativeFonts.regular, color: x.day.text },
  strong: { ...typeStyle('label'), fontFamily: nativeFonts.semibold, color: x.day.text },
  meta: { ...typeStyle('caption'), fontFamily: nativeFonts.regular, color: x.day.textSecondary },
} as const;

/** Một mục của màn chi tiết: thẻ trắng nổi trên nền kem, đầu thẻ có icon và tiêu đề cùng cỡ ở mọi mục. */
export function Section({
  title,
  icon,
  aside,
  children,
}: {
  title: string;
  icon?: IconName;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        padding: spacing.md,
        gap: spacing.md,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: x.day.line,
        backgroundColor: x.day.surface,
        shadowColor: x.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 14,
        shadowOpacity: 0.07,
        elevation: 2,
      }}
    >
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
        <Row style={{ gap: spacing.sm, alignItems: 'center', flexShrink: 1 }}>
          {icon && (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: x.day.tintWarm,
              }}
            >
              <Icon name={icon} size={18} color={x.brand.coral} />
            </View>
          )}
          <Txt accessibilityRole="header" style={[T.title, { flexShrink: 1 }]}>
            {title}
          </Txt>
        </Row>
        {aside}
      </Row>
      {children}
    </View>
  );
}

function IconLine({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: x.day.tintExplore,
        }}
      >
        <Icon name={icon} size={16} color={x.day.link} />
      </View>
      <Txt style={[T.body, { flex: 1, paddingTop: 5 }]}>{children}</Txt>
    </Row>
  );
}

function TextToggle({ isOpen, onPress }: { isOpen: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Txt style={[T.strong, { color: x.day.link }]}>{isOpen ? copy.showLess : copy.showMore}</Txt>
    </Pressable>
  );
}

/** Các mục thông tin khách sạn lấy y như web: nổi bật, tiện ích, xung quanh, mô tả, thông tin, chính sách. */
export function HotelInfoSections({ hotel }: { hotel: CommerceHotel }) {
  const [isDescriptionOpen, setDescriptionOpen] = useState(false);
  const [isAmenitiesOpen, setAmenitiesOpen] = useState(false);
  const featured = hotel.amenities.filter((amenity) => amenity.featured);
  const groups = [...new Set(hotel.amenities.map((amenity) => amenity.group))];
  const shownGroups = isAmenitiesOpen ? groups : groups.slice(0, COLLAPSED_AMENITY_GROUPS);
  const facts = Object.entries(hotel.facts ?? {}).filter(([, value]) => hasValue(value));
  const policies = Object.entries(hotel.policies ?? {}).filter(([, value]) => hasValue(value));
  // Mức cọc 0đ trùng với dòng "Không yêu cầu đặt cọc" nên không hiện riêng.
  const visiblePolicies = policies.filter(([key, value]) => key !== 'depositAmount' || Number(value) > 0);
  const hasPolicies = policies.length > 0 || !!hotel.checkInTime || !!hotel.checkOutTime;
  return (
    <>
      {hotel.highlights.length > 0 && (
        <Section title={copy.highlights} icon="sparkles-outline">
          {hotel.highlights.map((highlight, index) => (
            <IconLine key={`${highlight.text}-${index}`} icon={iconOf(highlight.icon)}>
              {highlight.text}
            </IconLine>
          ))}
        </Section>
      )}

      {featured.length > 0 && (
        <Section title={copy.featuredAmenities} icon="star-outline">
          <Row style={{ flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.md }}>
            {featured.map((amenity) => (
              <Row key={`${amenity.group}-${amenity.name}`} style={{ gap: spacing.sm, width: '46%' }}>
                <Icon name={iconOf(amenity.icon)} size={18} color={x.day.link} />
                <Txt style={[T.body, { flexShrink: 1 }]}>{amenity.name}</Txt>
              </Row>
            ))}
          </Row>
        </Section>
      )}

      {hotel.nearby.length > 0 && (
        <Section title={copy.nearby} icon="compass-outline">
          {hotel.address && (
            <Row style={{ gap: spacing.sm }}>
              <Icon name="location-outline" size={18} color={x.day.text} />
              <Txt style={[T.body, { flex: 1 }]}>{hotel.address}</Txt>
            </Row>
          )}
          {/* Khoảng cách địa danh hiện là dữ liệu mẫu: chỉ hiện tên địa danh, không hiện số km chưa kiểm chứng. */}
          {hotel.nearby.map((place) => (
            <Row key={place.name} style={{ gap: spacing.sm }}>
              <Icon name="navigate-outline" size={16} color={x.day.textSecondary} />
              <Txt style={[T.body, { flex: 1 }]}>{place.name}</Txt>
            </Row>
          ))}
        </Section>
      )}

      {hotel.description && (
        <Section title={copy.introduction} icon="information-circle-outline">
          <Txt numberOfLines={isDescriptionOpen ? undefined : 4} style={[T.body, { lineHeight: 24 }]}>
            {hotel.description}
          </Txt>
          <TextToggle isOpen={isDescriptionOpen} onPress={() => setDescriptionOpen((open) => !open)} />
        </Section>
      )}

      {(groups.length > 0 || facts.length > 0 || hotel.languages.length > 0) && (
        <Section title={copy.allAmenities} icon="checkmark-done-outline">
          {shownGroups.map((group) => (
            <View key={group} style={{ gap: spacing.sm }}>
              <Txt style={T.strong}>{labelOf(copy.groups, group)}</Txt>
              {hotel.amenities
                .filter((amenity) => amenity.group === group)
                .map((amenity) => (
                  <Row key={amenity.name} style={{ gap: spacing.sm }}>
                    <Icon name="checkmark" size={16} color={x.day.link} />
                    <Txt style={[T.body, { flex: 1 }]}>{amenity.name}</Txt>
                  </Row>
                ))}
            </View>
          ))}
          {groups.length > COLLAPSED_AMENITY_GROUPS && (
            <TextToggle isOpen={isAmenitiesOpen} onPress={() => setAmenitiesOpen((open) => !open)} />
          )}
          {facts.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Txt style={T.strong}>{copy.facts}</Txt>
              {facts.map(([key, value]) => (
                <Row key={key} style={{ justifyContent: 'space-between', gap: spacing.md }}>
                  <Txt style={T.meta}>{labelOf(copy.factLabels, key)}</Txt>
                  <Txt style={[T.body, { flexShrink: 1, textAlign: 'right' }]}>{String(value)}</Txt>
                </Row>
              ))}
            </View>
          )}
          {hotel.languages.length > 0 && (
            <Txt style={T.body}>
              <Txt style={T.strong}>{copy.languages}: </Txt>
              {hotel.languages.map((language) => labelOf(copy.languageNames, language)).join(', ')}
            </Txt>
          )}
        </Section>
      )}

      {hasPolicies && (
        <Section title={copy.policies} icon="shield-checkmark-outline">
          {(hotel.checkInTime || hotel.checkOutTime) && (
            <Row style={{ gap: spacing.sm }}>
              {[
                { label: copy.checkIn, value: hotel.checkInTime, icon: 'log-in-outline' as IconName },
                { label: copy.checkOut, value: hotel.checkOutTime, icon: 'log-out-outline' as IconName },
              ]
                .filter((item) => item.value)
                .map((item) => (
                  <View
                    key={item.label}
                    style={{
                      flex: 1,
                      padding: spacing.md,
                      borderRadius: radius.md,
                      backgroundColor: x.day.tintExplore,
                      gap: 2,
                    }}
                  >
                    <Row style={{ gap: 6 }}>
                      <Icon name={item.icon} size={16} color={x.day.link} />
                      <Txt style={T.meta}>{item.label}</Txt>
                    </Row>
                    <Txt style={[T.title, { fontSize: 22 }]}>{item.value}</Txt>
                  </View>
                ))}
            </Row>
          )}
          {visiblePolicies.length > 0 && (
            <View
              style={{
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: x.day.line,
                overflow: 'hidden',
              }}
            >
              {visiblePolicies.map(([key, value], index) => (
                <Row
                  key={key}
                  style={{
                    gap: spacing.md,
                    alignItems: 'flex-start',
                    padding: spacing.md,
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: x.day.line,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: x.day.tintWarm,
                    }}
                  >
                    <Icon
                      name={POLICY_ICONS[key] ?? 'document-text-outline'}
                      size={18}
                      color={x.brand.coral}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt style={T.strong}>{labelOf(copy.policyLabels, key)}</Txt>
                    <Txt style={[T.body, { color: x.day.textSecondary }]}>
                      {key === 'depositAmount' ? money(Number(value)) : String(value)}
                    </Txt>
                  </View>
                </Row>
              ))}
            </View>
          )}
        </Section>
      )}
    </>
  );
}

// Chữ trắng trên avatar nên chỉ dùng các tông đậm (tương phản >= 4.5:1).
const AVATAR_TONES = [x.day.link, x.day.error, x.day.text] as const;
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('');
const toneOf = (name: string) =>
  AVATAR_TONES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length]!;
const formatDay = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

function Chip({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 36,
          justifyContent: 'center',
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: isActive ? x.day.link : x.day.line,
          backgroundColor: isActive ? x.day.tintExplore : x.day.surface,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Txt style={[T.strong, { color: isActive ? x.day.link : x.day.text }]}>{label}</Txt>
    </Pressable>
  );
}

/** Chọn cách sắp xếp: một hàng ô liền nhau cuộn ngang được, ô đang chọn đậm màu để biết ngay mình đang xem theo gì. */
function SortTabs({
  value,
  onChange,
}: {
  value: HotelReviewFilters['sort'];
  onChange: (sort: NonNullable<HotelReviewFilters['sort']>) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -spacing.md }}
      contentContainerStyle={{ paddingHorizontal: spacing.md }}
    >
      <Row style={{ padding: 4, gap: 4, borderRadius: radius.md, backgroundColor: x.day.canvas }}>
        {(['newest', 'highest', 'lowest', 'helpful'] as const).map((sort) => {
          const isActive = value === sort;
          return (
            <Pressable
              key={sort}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(sort)}
              style={({ pressed }) => [
                {
                  minHeight: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.sm,
                  backgroundColor: isActive ? x.day.link : 'transparent',
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Txt style={[T.strong, { color: isActive ? x.brand.white : x.day.text }]}>{copy[sort]}</Txt>
            </Pressable>
          );
        })}
      </Row>
    </ScrollView>
  );
}

/** Đánh giá như web: điểm tổng, phân bố sao, tóm tắt AI, lọc theo chủ đề, danh sách và xem thêm. */
export function HotelReviewsSection({ id }: { id: string }) {
  const { isReady } = useApiSession();
  const [filters, setFilters] = useState<HotelReviewFilters>({
    sort: 'newest',
    page: 1,
    limit: REVIEW_PAGE_SIZE,
  });
  const query = useQuery({
    queryKey: ['hotels', id, 'reviews', filters],
    enabled: isReady,
    queryFn: ({ signal }) => getHotelReviews(id, filters, signal),
    placeholderData: (previous) => previous,
  });
  const update = (next: Partial<HotelReviewFilters>) =>
    setFilters((previous) => ({ ...previous, ...next, page: 1, limit: REVIEW_PAGE_SIZE }));
  const summary = query.data?.summary;
  const items = query.data?.items ?? [];
  const hasMore = !!query.data && items.length < query.data.total;
  return (
    <Section
      title={copy.reviews}
      icon="chatbubbles-outline"
      aside={
        summary ? <Txt style={T.meta}>{t('hotel.reviewCount', { count: summary.count })}</Txt> : undefined
      }
    >
      {summary && summary.count > 0 && (
        <Row
          style={{
            gap: spacing.lg,
            alignItems: 'center',
            padding: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: x.day.tintExplore,
          }}
        >
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: x.day.link,
            }}
          >
            <Txt style={{ ...typeStyle('title'), fontFamily: nativeFonts.extraBold, color: x.brand.white }}>
              {summary.average?.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
            </Txt>
            <Txt style={{ ...T.meta, color: x.brand.white }}>{copy.outOfFive}</Txt>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            {summary.distribution.map((level) => (
              <Row key={level.rating} style={{ gap: spacing.sm, alignItems: 'center' }}>
                <Txt style={[T.body, { width: 28 }]}>{level.rating} ★</Txt>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: x.day.surface }}>
                  <View
                    style={{
                      width: `${summary.count ? (level.count / summary.count) * 100 : 0}%`,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: x.day.link,
                    }}
                  />
                </View>
                <Txt style={[T.meta, { width: 28, textAlign: 'right' }]}>{level.count}</Txt>
              </Row>
            ))}
          </View>
        </Row>
      )}
      {summary?.aiSummary && (
        <View
          style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: x.day.tintSun, gap: 4 }}
        >
          <Row style={{ gap: 6 }}>
            <Icon name="sparkles-outline" size={16} color={x.day.text} />
            <Txt style={T.strong}>{copy.reviewSummary}</Txt>
          </Row>
          <Txt style={T.body}>{summary.aiSummary}</Txt>
        </View>
      )}
      <SortTabs value={filters.sort} onChange={(sort) => update({ sort })} />
      {summary && summary.tags.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          <Txt style={T.meta}>{copy.filterByTopic}</Txt>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -spacing.md }}
            contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
          >
            {summary.tags.map(({ tag, count }) => (
              <Chip
                key={tag}
                label={`${tag} · ${count}`}
                isActive={filters.tag === tag}
                onPress={() => update({ tag: filters.tag === tag ? undefined : tag })}
              />
            ))}
          </ScrollView>
        </View>
      )}
      <CommerceError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Txt style={T.body}>{copy.loadingReviews}</Txt>}
      {query.data && items.length === 0 && (
        <Txt style={T.meta}>{summary?.count ? copy.noMatchingReviews : copy.noReviews}</Txt>
      )}
      {items.map((review) => (
        <View
          key={review.id}
          style={{
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: x.day.line,
          }}
        >
          <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: toneOf(review.authorName),
              }}
            >
              <Txt style={{ ...T.strong, color: x.brand.white }}>{initialsOf(review.authorName)}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={T.strong}>{review.authorName}</Txt>
              <Txt style={T.meta}>
                {[
                  review.travelerType
                    ? labelOf(copy.travelerTypes as Record<string, string>, review.travelerType)
                    : null,
                  review.room?.name,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
            </View>
            <Txt style={{ color: x.day.text, letterSpacing: 1 }}>
              {'★'.repeat(review.rating)}
              <Txt style={{ color: x.day.line }}>{'★'.repeat(5 - review.rating)}</Txt>
            </Txt>
          </Row>
          {review.title && <Txt style={{ ...T.strong, fontSize: 15 }}>{review.title}</Txt>}
          <Txt style={T.body}>{review.body}</Txt>
          {review.tags.length > 0 && (
            <Row style={{ flexWrap: 'wrap', gap: 6 }}>
              {review.tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                    borderRadius: radius.sm,
                    backgroundColor: x.day.tintExplore,
                  }}
                >
                  <Txt style={[T.meta, { color: x.day.link, fontFamily: nativeFonts.medium }]}>{tag}</Txt>
                </View>
              ))}
            </Row>
          )}
          <Txt style={T.meta}>
            {copy.written}: {formatDay(review.createdAt)}
            {review.helpfulCount > 0 ? ` · ${t('hotel.helpfulCount', { count: review.helpfulCount })}` : ''}
          </Txt>
        </View>
      ))}
      {hasMore && (
        <Pressable
          accessibilityRole="button"
          disabled={query.isFetching}
          onPress={() =>
            setFilters((previous) => ({ ...previous, limit: (previous.limit ?? REVIEW_PAGE_SIZE) + 5 }))
          }
          style={{
            alignItems: 'center',
            minHeight: 48,
            justifyContent: 'center',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: x.day.link,
          }}
        >
          <Txt style={{ ...T.strong, color: x.day.link }}>
            {query.isFetching ? copy.loadingReviews : copy.moreReviews}
          </Txt>
        </Pressable>
      )}
    </Section>
  );
}
