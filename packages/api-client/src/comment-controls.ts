import { useQuery } from '@tanstack/react-query';
import { useApiSession } from './session';
import { readEntity } from './response';
import {
  commentControlsControllerPermissions,
  commentControlsControllerSettings,
  commentControlsControllerUpdate,
  commentControlsControllerQueue,
  commentControlsControllerDecide,
} from './generated/core-api/social-comment-controls/social-comment-controls';
import type { CommentSettingsDto } from './generated/core-api/model';

export const commentControlsApi = {
  async permissions(id: string, signal?: AbortSignal) {
    return readEntity((await commentControlsControllerPermissions(id, { signal })).data, [
      'enabled',
      'canManage',
    ]);
  },
  async settings(id: string, signal?: AbortSignal) {
    return readEntity((await commentControlsControllerSettings(id, { signal })).data, [
      'enabled',
      'keywords',
    ]);
  },
  async update(id: string, input: CommentSettingsDto) {
    return readEntity((await commentControlsControllerUpdate(id, input)).data, ['enabled', 'keywords']);
  },
  async queue(id: string, cursor?: string, signal?: AbortSignal) {
    return readEntity((await commentControlsControllerQueue(id, { cursor, limit: 20 }, { signal })).data, [
      'items',
      'nextCursor',
    ]);
  },
  async decide(id: string, decision: 'approve' | 'reject') {
    return readEntity((await commentControlsControllerDecide(id, { decision })).data, [
      'id',
      'creatorReview',
      'status',
    ]);
  },
};

export function useCommentPermissions(postId: string) {
  const { user } = useApiSession();
  return useQuery({
    queryKey: ['social', 'comment-permissions', postId, user?.id],
    queryFn: ({ signal }) => commentControlsApi.permissions(postId, signal),
    staleTime: 5000,
    refetchInterval: 10000,
  });
}
