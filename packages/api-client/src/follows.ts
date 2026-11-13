import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  followsControllerFollow, followsControllerGetStatus, followsControllerUnfollow,
} from './generated/core-api/social-follows/social-follows';
import { readEntity } from './response';
import { useApiSession } from './session';

export function useFollowAuthor(authorId?: string) {
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const queryKey = ['social', 'follow', user?.id, authorId] as const;
  const enabled = isReady && !!user && !!authorId && user.id !== authorId;
  const status = useQuery({
    queryKey,
    enabled,
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ signal }) => readEntity((await followsControllerGetStatus(authorId!, { signal })).data, ['isFollowing']),
  });
  const update = useMutation({
    mutationFn: async ({ target, isFollowing }: { target: string; viewerId: string; isFollowing: boolean }) => {
      const write = isFollowing ? followsControllerFollow : followsControllerUnfollow;
      return readEntity((await write(target)).data, ['isFollowing']);
    },
    onMutate: () => client.cancelQueries({ queryKey, exact: true }),
    onSuccess: (next, { target, viewerId }) => {
      client.setQueryData(['social', 'follow', viewerId, target], next);
    },
    onError: (_, { target, viewerId }) => client.invalidateQueries({
      queryKey: ['social', 'follow', viewerId, target], exact: true,
    }),
  });

  function toggle(): void {
    if (!enabled || status.data === undefined || update.isPending) return;
    update.mutate({ target: authorId!, viewerId: user!.id, isFollowing: !status.data.isFollowing });
  }

  return {
    isFollowing: status.data?.isFollowing ?? false,
    isLoading: enabled && status.isPending,
    isUpdating: update.isPending,
    canToggle: enabled && status.data !== undefined && !update.isPending,
    error: update.error ?? status.error,
    retry: () => {
      update.reset();
      void status.refetch();
    },
    toggle,
  };
}
