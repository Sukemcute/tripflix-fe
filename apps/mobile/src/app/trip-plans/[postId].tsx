import { getBookableTripPlan } from '@tripflix/app-core';
import { HttpError, socialApi, useApiSession } from '@tripflix/api-client';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Button, Notice, Screen, Txt } from '@/components/mobile-ui';
import { LoadingDots } from '@/components/loading-dots';
import { saveTripBooking } from '@/features/booking/trip-booking-store';

/** Deep link dal web: nạp đúng lộ trình rồi đưa người dùng vào luồng đặt combo trong app. */
export default function BookTripPlanLink() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { user, isReady } = useApiSession();
  const handled = useRef(false);
  const query = useQuery({
    queryKey: ['social', 'post', postId, user?.id],
    enabled: isReady && Boolean(postId),
    retry: (count, error) => !(error instanceof HttpError && error.status === 404) && count < 2,
    queryFn: ({ signal }) => socialApi.getPost(postId, signal),
  });
  const post = query.data?.post;

  useEffect(() => {
    if (handled.current || !post?.tripAttachment || !getBookableTripPlan(post.tripAttachment)) return;
    handled.current = true;
    saveTripBooking({
      postId: post.id,
      postTitle: post.title,
      authorName: post.authorName ?? 'Cộng đồng Tripflix',
      coverUrl: post.tripAttachment.posterUrl ?? post.images?.[0]?.url ?? undefined,
      trip: post.tripAttachment,
    });
    router.replace('/(tabs)/book');
  }, [post]);

  if (!isReady || query.isPending) {
    return (
      <Screen>
        <LoadingDots />
      </Screen>
    );
  }

  if (query.isError || !post?.tripAttachment || !getBookableTripPlan(post.tripAttachment)) {
    return (
      <Screen>
        <Notice>
          <Txt variant="heading">Không mở được lộ trình đặt combo</Txt>
          <Txt variant="small">Lộ trình này hiện chưa có dịch vụ để đặt hoặc không còn khả dụng.</Txt>
        </Notice>
        <Button onPress={() => router.replace('/(tabs)/explore')}>Khám phá lộ trình khác</Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <LoadingDots />
    </Screen>
  );
}
