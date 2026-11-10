import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getHotelReviews,
  useApiSession,
  type CommerceHotel,
  type HotelReviewFilters,
} from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { Pressable, View } from 'react-native';
import { Icon, type IconName, money, Row, Txt, ui } from '@/components/mobile-ui';
import { CommerceError } from './commerce-state';

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
const iconOf = (name?: string | null): IconName => (name && ICONS[name]) || 'sparkles-outline';

/** Một mục của màn chi tiết: tiêu đề + nội dung, ngăn nhau bằng dải xám như Agoda. */
export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        paddingVertical: spacing.lg,
        gap: spacing.md,
        borderTopWidth: 8,
        borderTopColor: colors.surface,
      }}
    >
      <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Txt variant="heading">{title}</Txt>
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
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.seaMist,
        }}
      >
        <Icon name={icon} size={16} color={colors.tealInk} />
      </View>
      <Txt style={{ flex: 1, paddingTop: 5 }}>{children}</Txt>
    </Row>
  );
}

function TextToggle({ isOpen, onPress }: { isOpen: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Txt variant="label" style={{ color: colors.tealInk }}>
        {isOpen ? copy.showLess : copy.showMore}
      </Txt>
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
  const hasPolicies = policies.length > 0 || !!hotel.checkInTime || !!hotel.checkOutTime;
  return (
    <>
      {hotel.highlights.length > 0 && (
        <Section title={copy.highlights}>
          {hotel.highlights.map((highlight, index) => (
            <IconLine key={`${highlight.text}-${index}`} icon={iconOf(highlight.icon)}>
              {highlight.text}
            </IconLine>
          ))}
        </Section>
      )}

      {featured.length > 0 && (
        <Section title={copy.featuredAmenities}>
          <Row style={{ flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.md }}>
            {featured.map((amenity) => (
              <Row key={`${amenity.group}-${amenity.name}`} style={{ gap: spacing.sm, width: '46%' }}>
                <Icon name={iconOf(amenity.icon)} size={18} color={colors.tealInk} />
                <Txt variant="small" style={{ flexShrink: 1 }}>
                  {amenity.name}
                </Txt>
              </Row>
            ))}
          </Row>
        </Section>
      )}

      {hotel.nearby.length > 0 && (
        <Section title={copy.nearby}>
          {hotel.address && (
            <Row style={{ gap: spacing.sm }}>
              <Icon name="location-outline" size={18} color={colors.coralInk} />
              <Txt variant="small" style={{ flex: 1 }}>
                {hotel.address}
              </Txt>
            </Row>
          )}
          {hotel.nearby.map((place) => (
            <Row key={place.name} style={{ justifyContent: 'space-between', gap: spacing.md }}>
              <Txt variant="small" style={{ flex: 1 }}>
                {place.name}
              </Txt>
              <Txt variant="small" style={ui.muted}>
                {place.distanceKm.toLocaleString('vi-VN')} km
              </Txt>
            </Row>
          ))}
          <Txt variant="small" style={[ui.muted, { fontSize: 11 }]}>
            {copy.mockNearby}
          </Txt>
        </Section>
      )}

      {hotel.description && (
        <Section title={copy.introduction}>
          <Txt numberOfLines={isDescriptionOpen ? undefined : 4} style={{ lineHeight: 22 }}>
            {hotel.description}
          </Txt>
          <TextToggle isOpen={isDescriptionOpen} onPress={() => setDescriptionOpen((open) => !open)} />
        </Section>
      )}

      {(groups.length > 0 || facts.length > 0 || hotel.languages.length > 0) && (
        <Section title={copy.allAmenities}>
          {shownGroups.map((group) => (
            <View key={group} style={{ gap: spacing.sm }}>
              <Txt variant="label">{labelOf(copy.groups, group)}</Txt>
              {hotel.amenities
                .filter((amenity) => amenity.group === group)
                .map((amenity) => (
                  <Row key={amenity.name} style={{ gap: spacing.sm }}>
                    <Icon name="checkmark" size={16} color={colors.teal} />
                    <Txt variant="small" style={{ flex: 1 }}>
                      {amenity.name}
                    </Txt>
                  </Row>
                ))}
            </View>
          ))}
          {groups.length > COLLAPSED_AMENITY_GROUPS && (
            <TextToggle isOpen={isAmenitiesOpen} onPress={() => setAmenitiesOpen((open) => !open)} />
          )}
          {facts.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Txt variant="label">{copy.facts}</Txt>
              {facts.map(([key, value]) => (
                <Row key={key} style={{ justifyContent: 'space-between', gap: spacing.md }}>
                  <Txt variant="small" style={ui.muted}>
                    {labelOf(copy.factLabels, key)}
                  </Txt>
                  <Txt variant="small" style={{ flexShrink: 1, textAlign: 'right' }}>
                    {String(value)}
                  </Txt>
                </Row>
              ))}
            </View>
          )}
          {hotel.languages.length > 0 && (
            <Txt variant="small">
              <Txt variant="small" style={{ fontWeight: '700' }}>
                {copy.languages}:{' '}
              </Txt>
              {hotel.languages.map((language) => labelOf(copy.languageNames, language)).join(', ')}
            </Txt>
          )}
        </Section>
      )}

      {hasPolicies && (
        <Section title={copy.policies}>
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
                      borderRadius: radius.lg,
                      backgroundColor: colors.surface,
                      gap: 2,
                    }}
                  >
                    <Row style={{ gap: 6 }}>
                      <Icon name={item.icon} size={16} color={colors.tealInk} />
                      <Txt variant="small" style={ui.muted}>
                        {item.label}
                      </Txt>
                    </Row>
                    <Txt variant="heading">{item.value}</Txt>
                  </View>
                ))}
            </Row>
          )}
          {policies.map(([key, value]) => (
            <View key={key} style={{ gap: 2 }}>
              <Txt variant="label">{labelOf(copy.policyLabels, key)}</Txt>
              <Txt variant="small" style={ui.muted}>
                {key === 'depositAmount' ? money(Number(value)) : String(value)}
              </Txt>
            </View>
          ))}
        </Section>
      )}
    </>
  );
}

const AVATAR_TONES = [colors.tealInk, colors.coralInk, colors.sun] as const;
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
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: isActive ? colors.ink : colors.border,
        backgroundColor: isActive ? colors.ink : colors.background,
      }}
    >
      <Txt variant="small" style={{ color: isActive ? colors.background : colors.ink, fontWeight: '600' }}>
        {label}
      </Txt>
    </Pressable>
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
      aside={
        summary ? (
          <Txt variant="small" style={ui.muted}>
            {t('hotel.reviewCount', { count: summary.count })}
          </Txt>
        ) : undefined
      }
    >
      {summary && summary.count > 0 && (
        <Row style={{ gap: spacing.lg, alignItems: 'center' }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.tealInk,
            }}
          >
            <Txt variant="title" style={{ color: colors.background }}>
              {summary.average?.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
            </Txt>
            <Txt variant="small" style={{ color: colors.background }}>
              {copy.outOfFive}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            {summary.distribution.map((level) => (
              <Row key={level.rating} style={{ gap: spacing.sm, alignItems: 'center' }}>
                <Txt variant="small" style={{ width: 28 }}>
                  {level.rating} ★
                </Txt>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted }}>
                  <View
                    style={{
                      width: `${summary.count ? (level.count / summary.count) * 100 : 0}%`,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.teal,
                    }}
                  />
                </View>
                <Txt variant="small" style={[ui.muted, { width: 28, textAlign: 'right' }]}>
                  {level.count}
                </Txt>
              </Row>
            ))}
          </View>
        </Row>
      )}
      {summary?.aiSummary && (
        <View
          style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.sunSoft, gap: 4 }}
        >
          <Row style={{ gap: 6 }}>
            <Icon name="sparkles-outline" size={16} color={colors.coralInk} />
            <Txt variant="label">{copy.reviewSummary}</Txt>
          </Row>
          <Txt variant="small">{summary.aiSummary}</Txt>
        </View>
      )}
      <Row style={{ flexWrap: 'wrap', gap: spacing.sm }}>
        {(['newest', 'highest', 'lowest', 'helpful'] as const).map((sort) => (
          <Chip
            key={sort}
            label={copy[sort]}
            isActive={filters.sort === sort}
            onPress={() => update({ sort })}
          />
        ))}
      </Row>
      {summary && summary.tags.length > 0 && (
        <Row style={{ flexWrap: 'wrap', gap: spacing.sm }}>
          {summary.tags.map(({ tag, count }) => (
            <Chip
              key={tag}
              label={`${tag} · ${count}`}
              isActive={filters.tag === tag}
              onPress={() => update({ tag: filters.tag === tag ? undefined : tag })}
            />
          ))}
        </Row>
      )}
      <CommerceError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Txt variant="small">{copy.loadingReviews}</Txt>}
      {query.data && items.length === 0 && (
        <Txt variant="small" style={ui.muted}>
          {summary?.count ? copy.noMatchingReviews : copy.noReviews}
        </Txt>
      )}
      {items.map((review) => (
        <View
          key={review.id}
          style={{
            gap: spacing.sm,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
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
              <Txt variant="label" style={{ color: colors.background }}>
                {initialsOf(review.authorName)}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="label">{review.authorName}</Txt>
              <Txt variant="small" style={ui.muted}>
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
            <Txt style={{ color: colors.coralInk, letterSpacing: 1 }}>
              {'★'.repeat(review.rating)}
              <Txt style={{ color: colors.border }}>{'★'.repeat(5 - review.rating)}</Txt>
            </Txt>
          </Row>
          {review.title && <Txt variant="label">{review.title}</Txt>}
          <Txt variant="small" style={{ lineHeight: 20 }}>
            {review.body}
          </Txt>
          {review.tags.length > 0 && (
            <Row style={{ flexWrap: 'wrap', gap: 6 }}>
              {review.tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                    borderRadius: radius.pill,
                    backgroundColor: colors.seaMist,
                  }}
                >
                  <Txt variant="small" style={{ color: colors.tealInk }}>
                    {tag}
                  </Txt>
                </View>
              ))}
            </Row>
          )}
          <Txt variant="small" style={[ui.muted, { fontSize: 11 }]}>
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
            paddingVertical: spacing.md,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Txt variant="label">{query.isFetching ? copy.loadingReviews : copy.moreReviews}</Txt>
        </Pressable>
      )}
    </Section>
  );
}
