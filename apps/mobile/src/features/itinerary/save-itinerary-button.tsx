import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itineraryApi, SAVED_ITINERARIES_QUERY_KEY, useApiSession } from '@tripflix/api-client';
import type { SaveItineraryRequestDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/mobile-ui';

const copy = vi.mobile.savedItinerary;

/**
 * Nút Lưu lộ trình (TF105), bấm lại để bỏ lưu. Lộ trình từ reel tra theo postId nên mở lại reel vẫn thấy "Đã lưu";
 * lộ trình Tripi, tự lên lộ trình thì nhớ bản vừa lưu trong lần xem này. Chưa đăng nhập thì sang màn đăng nhập.
 */
export function SaveItineraryButton({
  request,
  compact = true,
}: {
  request: () => SaveItineraryRequestDto | null;
  compact?: boolean;
}) {
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const draft = request();
  const postId = draft?.source === 'reel' ? draft.postId : undefined;
  const [savedId, setSavedId] = useState<string | null>(null);
  const existing = useQuery({
    queryKey: [...SAVED_ITINERARIES_QUERY_KEY, user?.id, 'post', postId],
    enabled: isReady && !!user && !!postId,
    queryFn: ({ signal }) => itineraryApi.list(postId, signal),
  });
  const currentId = savedId ?? existing.data?.[0]?.id ?? null;
  const toggle = useMutation({
    mutationFn: async () => {
      if (currentId) {
        await itineraryApi.remove(currentId);
        return null;
      }
      const body = request();
      return body ? (await itineraryApi.save(body)).id : null;
    },
    onSuccess: (id) => {
      setSavedId(id);
      if (!id && postId) client.setQueryData([...SAVED_ITINERARIES_QUERY_KEY, user?.id, 'post', postId], []);
      void client.invalidateQueries({ queryKey: SAVED_ITINERARIES_QUERY_KEY });
    },
  });
  if (!draft) return null;
  return (
    <Button
      compact={compact}
      tone="secondary"
      icon={currentId ? 'bookmark' : 'bookmark-outline'}
      disabled={toggle.isPending}
      onPress={() => (user ? toggle.mutate() : router.push('/login'))}
    >
      {toggle.isError ? copy.saveFailed : currentId ? copy.saved : copy.save}
    </Button>
  );
}
