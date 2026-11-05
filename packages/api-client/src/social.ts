import * as posts from './generated/core-api/social-posts/social-posts';
import * as comments from './generated/core-api/social-comments/social-comments';
import * as bookmarks from './generated/core-api/social-bookmarks/social-bookmarks';
import * as reactions from './generated/core-api/social-reactions-stats/social-reactions-stats';
import * as moderation from './generated/core-api/social-admin-moderation/social-admin-moderation';
import type {
  CreatePostDto,
  UpdatePostDto,
  SetReactionDtoType,
  PostsControllerListPublicPostsParams,
  PostsControllerListMyPostsParams,
  AdminPostsControllerListAdminPostsParams,
  CreateModerationActionDto,
} from './generated/core-api/model';
import { readEntity, readPage } from './response';

export const socialApi = {
  async listPosts(query: PostsControllerListPublicPostsParams = {}, signal?: AbortSignal) {
    return readPage((await posts.postsControllerListPublicPosts(query, { signal })).data);
  },
  async listMyPosts(query: PostsControllerListMyPostsParams = {}, signal?: AbortSignal) {
    return readPage((await posts.postsControllerListMyPosts(query, { signal })).data);
  },
  async listBookmarks(cursor?: string, signal?: AbortSignal) {
    return readPage((await bookmarks.bookmarksControllerListMyBookmarks({ cursor }, { signal })).data);
  },
  async getPost(id: string, signal?: AbortSignal) {
    return readEntity((await posts.postsControllerGetPostDetail(encodeURIComponent(id), { signal })).data, [
      'post',
      'viewerContext',
      'shareUrl',
    ]);
  },
  async createDraft(draft: CreatePostDto) {
    return readEntity((await posts.postsControllerCreateDraft(draft)).data, ['id', 'title', 'status']);
  },
  async updatePost(id: string, patch: UpdatePostDto) {
    return readEntity((await posts.postsControllerUpdatePost(encodeURIComponent(id), patch)).data, [
      'id',
      'title',
      'status',
    ]);
  },
  async deletePost(id: string) {
    return (await posts.postsControllerDeletePost(encodeURIComponent(id))).data;
  },
  async publishPost(id: string) {
    return (await posts.postsControllerPublishPost(encodeURIComponent(id))).data;
  },
  async sharePost(id: string) {
    return (await posts.postsControllerTrackShare(encodeURIComponent(id))).data;
  },
  async setReaction(id: string, type: SetReactionDtoType) {
    return (await reactions.reactionsControllerSetReaction(encodeURIComponent(id), { type })).data;
  },
  async setBookmark(id: string, isBookmarked: boolean) {
    return (
      await bookmarks.bookmarksControllerSetBookmark(encodeURIComponent(id), { is_bookmarked: isBookmarked })
    ).data;
  },
  async listComments(id: string, cursor?: string, parentCommentId?: string, signal?: AbortSignal) {
    return readPage(
      (
        await comments.commentsControllerListComments(
          encodeURIComponent(id),
          { cursor, parent_comment_id: parentCommentId },
          { signal },
        )
      ).data,
    );
  },
  async addComment(id: string, body: string, parentCommentId?: string) {
    return (
      await comments.commentsControllerCreateComment(encodeURIComponent(id), {
        body,
        parent_comment_id: parentCommentId,
      })
    ).data;
  },
  async editComment(id: string, body: string) {
    return (await comments.commentsControllerEditComment(encodeURIComponent(id), { body })).data;
  },
  async deleteComment(id: string) {
    return (await comments.commentsControllerDeleteComment(encodeURIComponent(id))).data;
  },
  async listAdminPosts(query: AdminPostsControllerListAdminPostsParams = {}, signal?: AbortSignal) {
    return readPage((await moderation.adminPostsControllerListAdminPosts(query, { signal })).data);
  },
  async getAdminPost(id: string, signal?: AbortSignal) {
    return (await moderation.adminPostsControllerGetAdminPostDetail(encodeURIComponent(id), { signal })).data;
  },
  async moderatePost(id: string, action: CreateModerationActionDto) {
    return (await moderation.adminPostsControllerModeratePost(encodeURIComponent(id), action)).data;
  },
};
