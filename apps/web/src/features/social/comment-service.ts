import { socialApi } from '@tripflix/api-client';
import type { CommentMentionDto, SocialCommentDto } from '@tripflix/api-client/core-api/model/index';
import { prepareCommentSubmission, type CommentMention } from './mention-input';

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
 * Gọi API tạo bình luận gửi kèm mentions (TF25).
 * Tự động chuẩn hoá khoảng trắng đầu/cuối và dịch offset UTF-16 trước khi gửi.
 */
export async function createCommentWithMentions(
  params: CreateCommentWithMentionsParams,
): Promise<SocialCommentDto | void> {
  const { postId, body, parentCommentId, mentions = [] } = params;
  const prepared = prepareCommentSubmission(body, mentions);
  const dtoMentions: CommentMentionDto[] = prepared.mentions;
  return socialApi.addComment(postId, prepared.body, parentCommentId, dtoMentions);
}

/**
 * Gọi API sửa bình luận gửi kèm mentions (TF25).
 * Luôn gửi danh sách mentions hiện tại (kể cả `[]` khi xoá hết tag) để BE không giữ/kiểm lại tag cũ.
 */
export async function editCommentWithMentions(
  params: EditCommentWithMentionsParams,
): Promise<SocialCommentDto> {
  const { commentId, body, mentions = [] } = params;
  const prepared = prepareCommentSubmission(body, mentions);
  const dtoMentions: CommentMentionDto[] = prepared.mentions;
  return socialApi.editComment(commentId, prepared.body, dtoMentions);
}
