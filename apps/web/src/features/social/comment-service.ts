import { socialApi } from '@tripflix/api-client';
import type { SocialCommentDto } from '@tripflix/api-client/core-api/model/index';
import type { CommentMention } from './mention-input';

export interface CreateCommentWithMentionsParams {
  postId: string;
  body: string;
  parentCommentId?: string;
  mentions?: CommentMention[];
}

export interface EditCommentWithMentionsParams {
  commentId: string;
  body: string;
  mentions?: CommentMention[];
}

/**
 * Điểm tập trung gọi API tạo bình luận gửi kèm mentions (TF25).
 * Hiện tại client API (packages/api-client) chưa có field mentions do BE đang hoàn thiện song song.
 * Gom tại đây để khi BE xong chỉ cần `pnpm gen:api` và nối trường mentions trực tiếp.
 */
export async function createCommentWithMentions(
  params: CreateCommentWithMentionsParams,
): Promise<SocialCommentDto> {
  const { postId, body, parentCommentId, mentions } = params;
  // Ép kiểu để sẵn sàng nhận và truyền mentions khi packages/api-client được gen lại từ contracts
  const api = socialApi as unknown as {
    addComment: (
      id: string,
      body: string,
      parentCommentId?: string,
      mentions?: CommentMention[],
    ) => Promise<SocialCommentDto>;
  };
  return api.addComment(postId, body, parentCommentId, mentions);
}

/**
 * Điểm tập trung gọi API sửa bình luận gửi kèm mentions (TF25).
 */
export async function editCommentWithMentions(
  params: EditCommentWithMentionsParams,
): Promise<SocialCommentDto> {
  const { commentId, body, mentions } = params;
  const api = socialApi as unknown as {
    editComment: (
      id: string,
      body: string,
      mentions?: CommentMention[],
    ) => Promise<SocialCommentDto>;
  };
  return api.editComment(commentId, body, mentions);
}
