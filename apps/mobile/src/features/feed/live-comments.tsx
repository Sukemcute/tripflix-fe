import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, useApiSession } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, Card, Field, Icon, Notice, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';
import { router } from 'expo-router';
import { CommentLikeButton } from './comment-like-button';
import { ReelCommentComposer } from './reel-comment-composer';
import { CommunitySummary } from './post-summary';
import { ReportButton } from './report-button';

const REPORT_HIT_SLOP = { top: 6, bottom: 6, left: 15, right: 15 };
const COMPACT_REPORT_HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 };

function CommentAction({
  compact,
  disabled = false,
  onPress,
  children,
}: PropsWithChildren<{
  compact: boolean;
  disabled?: boolean;
  onPress: () => void;
}>) {
  if (!compact)
    return (
      <Button tone="text" disabled={disabled} onPress={onPress}>
        {children}
      </Button>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.action}
    >
      <Txt variant="caption" style={styles.actionLabel}>
        {children}
      </Txt>
    </Pressable>
  );
}

export function LiveComments({
  postId,
  parentCommentId,
  showHeading = true,
  compact = false,
  renderContent,
  onLoginRequired,
  onRevealComment,
  showSummary = false,
}: {
  postId: string;
  parentCommentId?: string;
  /** AI summary chỉ đặt ở bình luận của reel (web và mobile giống nhau). */
  showSummary?: boolean;
  showHeading?: boolean;
  compact?: boolean;
  renderContent?: (content: ReactNode) => ReactNode;
  /** A sheet in a Modal must close first, because the login screen would open behind it. */
  onLoginRequired?: () => void;
  /** Cuộn danh sách tới vị trí y (tính trong nội dung), để bình luận đang trả lời nằm trên cùng. */
  onRevealComment?: (y: number) => void;
}) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | undefined>();
  // Trả lời đi qua ô nhập chính ở đáy khung, như TikTok: không mở ô nhập thứ hai trong danh sách.
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string }>();
  const [focusRequest, setFocusRequest] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  // Vị trí từng bình luận trong danh sách, đo khi hiện ra.
  const commentOffsets = useRef(new Map<string, number>());
  useEffect(() => {
    if (!replyTarget || !onRevealComment) return;
    // Đợi khoảng trống phía dưới hiện ra rồi mới cuộn, nếu không bình luận cuối không lên được tới đỉnh.
    const timer = setTimeout(() => {
      const y = commentOffsets.current.get(replyTarget.id);
      if (y !== undefined) onRevealComment(Math.max(0, y - spacing.sm));
    }, 50);
    return () => clearTimeout(timer);
  }, [replyTarget, onRevealComment]);
  const goToLogin =
    onLoginRequired ?? (() => router.push({ pathname: '/login', params: { returnTo: `/trip/${postId}` } }));
  // Whether a comment is liked depends on who is viewing, so each viewer keeps a separate list.
  const queryKey = ['social', 'comments', postId, parentCommentId, user?.id];
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => socialApi.listComments(postId, pageParam, parentCommentId, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const mutation = useMutation({
    mutationFn: async (action: 'save' | string) =>
      action !== 'save'
        ? socialApi.deleteComment(action)
        : editing
          ? socialApi.editComment(editing, body.trim())
          : socialApi.addComment(postId, body.trim(), replyTarget?.id ?? parentCommentId),
    onSuccess: async (_, action) => {
      if (action === 'save') {
        setBody('');
        setEditing(null);
        // Mở sẵn chuỗi trả lời để người gửi thấy trả lời của mình.
        if (replyTarget && !parentCommentId) setReplying(replyTarget.id);
        setReplyTarget(undefined);
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social', 'comments', postId] }),
        client.invalidateQueries({ queryKey: ['social', 'post', postId] }),
        client.invalidateQueries({ queryKey: ['social', 'summary', postId] }),
        client.invalidateQueries({ queryKey: ['feed'], refetchType: 'none' }),
      ]);
    },
  });
  const content = (
    <>
      {showSummary && !parentCommentId && <CommunitySummary key={postId} postId={postId} />}
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Txt>{vi.api.loading}</Txt>}
      {/* Trả lời trống thì không cần lời mời bình luận; chỉ danh sách gốc mới hiện. */}
      {!parentCommentId && query.data?.pages[0]?.items.length === 0 && <Notice>{vi.api.noComments}</Notice>}
      {query.data?.pages
        .flatMap((page) => page.items)
        .map((comment) => {
          const authorName =
            comment.authorId === user?.id
              ? user.displayName
              : comment.authorName || comment.authorId.slice(0, 8);
          const likeButton = !comment.deletedAt && (
            <CommentLikeButton
              commentId={comment.id}
              isLiked={comment.isLiked}
              likeCount={comment.likeCount}
              authorName={authorName}
              queryKey={queryKey}
              compact={compact}
              onLoginRequired={goToLogin}
            />
          );
          return (
            <View
              key={comment.id}
              style={compact ? styles.comment : undefined}
              onLayout={(event) => commentOffsets.current.set(comment.id, event.nativeEvent.layout.y)}
            >
              {compact && (
                <View style={[styles.avatar, !!parentCommentId && styles.replyAvatar]}>
                  <Icon name="person-outline" size={parentCommentId ? 12 : 14} color={colors.textMuted} />
                </View>
              )}
              <Card style={compact ? styles.commentBody : undefined}>
                <Txt variant="caption" style={compact && styles.author}>
                  {authorName}{comment.replyToName && ` ↳ ${comment.replyToName}`}
                  {!compact && ` · ${new Date(comment.createdAt).toLocaleDateString('vi-VN')}`}
                </Txt>
                <Txt style={compact && styles.message}>{comment.body}</Txt>
                {!compact && likeButton}
                <View style={compact ? styles.actions : undefined}>
                  {compact && (
                    <Txt variant="caption" style={styles.date}>
                      {new Date(comment.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}
                    </Txt>
                  )}
                  {comment.authorId === user?.id && (
                    <>
                      <CommentAction
                        compact={compact}
                        disabled={mutation.isPending}
                        onPress={() => {
                          setEditing(comment.id);
                          setBody(comment.body);
                        }}
                      >
                        {vi.api.edit}
                      </CommentAction>
                      <CommentAction
                        compact={compact}
                        disabled={mutation.isPending}
                        onPress={() => mutation.mutate(comment.id)}
                      >
                        {vi.api.remove}
                      </CommentAction>
                    </>
                  )}
                  {(parentCommentId || compact) && (
                    <CommentAction
                      compact={compact}
                      onPress={() => {
                        if (!user) return goToLogin();
                        setEditing(null);
                        setReplyTarget({ id: comment.id, name: authorName });
                        setFocusRequest((value) => value + 1);
                      }}
                    >
                      {vi.api.reply}
                    </CommentAction>
                  )}
                  {/* Chỉ mời xem khi có trả lời; đang mở thì cho ẩn. */}
                  {!parentCommentId && !compact && (
                    <CommentAction
                      compact={compact}
                      onPress={() => setReplying(replying === comment.id ? undefined : comment.id)}
                    >
                      {replying === comment.id
                        ? vi.api.hideReplies
                        : comment.replyCount
                          ? t('api.viewReplies', { count: comment.replyCount })
                          : vi.api.replies}
                    </CommentAction>
                  )}
                  {/* Cờ nhỏ, cùng màu chữ phụ: báo cáo ít dùng nên không chiếm một dòng riêng. */}
                  {comment.authorId !== user?.id && (
                    <ReportButton
                      targetType="comment"
                      targetId={comment.id}
                      trigger={(open) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={vi.moderation.reportTitle}
                          hitSlop={compact ? COMPACT_REPORT_HIT_SLOP : REPORT_HIT_SLOP}
                          onPress={open}
                          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                        >
                          <Icon name="flag-outline" size={compact ? 12 : 14} color={colors.textMuted} />
                        </Pressable>
                      )}
                    />
                  )}
                  {compact && likeButton}
                </View>
                {!parentCommentId && replying === comment.id && (
                  <View style={compact && styles.replyThread}>
                    <LiveComments
                      postId={postId}
                      parentCommentId={comment.id}
                      showHeading={!compact}
                      compact={compact}
                      onLoginRequired={onLoginRequired}
                    />
                  </View>
                )}
                {compact && !parentCommentId && (!!comment.replyCount || replying === comment.id) && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: replying === comment.id }}
                    onPress={() => setReplying(replying === comment.id ? undefined : comment.id)}
                    style={styles.replies}
                  >
                    <View style={styles.replyLine} />
                    <Txt variant="caption" style={styles.actionLabel}>
                      {replying === comment.id
                        ? vi.api.hideReplies
                        : t('mobile.reelComments.showReplies', { count: comment.replyCount ?? 0 })}
                    </Txt>
                    <Icon
                      name={replying === comment.id ? 'chevron-up' : 'chevron-down'}
                      size={11}
                      color={colors.textMuted}
                    />
                  </Pressable>
                )}
              </Card>
            </View>
          );
        })}
      {/* Chừa chỗ dưới cùng khi đang trả lời, để bình luận ở cuối danh sách vẫn cuộn lên được trên cùng. */}
      {replyTarget && onRevealComment && <View style={{ height: windowHeight * 0.5 }} />}
      {query.hasNextPage && (
        <Button
          disabled={query.isFetchingNextPage}
          onPress={() => {
            void query.fetchNextPage();
          }}
        >
          {vi.api.next}
        </Button>
      )}
    </>
  );
  return (
    <>
      {showHeading && <Txt variant="heading">{vi.api.comments}</Txt>}
      {renderContent ? renderContent(content) : content}
      {/* Trả lời trong khung reels gửi từ ô nhập chính; ô nhập ở đây chỉ còn để sửa trả lời của mình. */}
      {!(compact && parentCommentId && !editing) && (
        <View style={renderContent ? styles.composer : compact ? undefined : styles.inlineComposer}>
          <ApiErrorNotice error={mutation.error} />
          {user ? (
            <>
              {compact ? (
                <>
                  {replyTarget && (
                    <View style={styles.replyingBar}>
                      <Txt variant="caption" style={[styles.muted, styles.replyingText]} numberOfLines={1}>
                        {t('api.replyingTo', { name: replyTarget.name })}
                      </Txt>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={vi.api.cancel}
                        hitSlop={REPORT_HIT_SLOP}
                        onPress={() => setReplyTarget(undefined)}
                      >
                        <Icon name="close" size={16} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  )}
                  <ReelCommentComposer
                    label={
                      editing
                        ? vi.api.edit
                        : replyTarget || parentCommentId
                          ? vi.api.reply
                          : vi.api.commentBody
                    }
                    placeholder={
                      replyTarget ? t('api.replyPlaceholder', { name: replyTarget.name }) : undefined
                    }
                    value={body}
                    onChange={setBody}
                    onSend={() => mutation.mutate('save')}
                    isPending={mutation.isPending}
                    focusRequest={focusRequest}
                    authorName={user.displayName}
                  />
                </>
              ) : (
                <>
                  <Field
                    label={editing ? vi.api.edit : parentCommentId ? vi.api.reply : vi.api.commentBody}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    maxLength={10000}
                  />
                  <Button
                    disabled={mutation.isPending || !body.trim()}
                    onPress={() => mutation.mutate('save')}
                  >
                    {mutation.isPending ? vi.api.saving : vi.api.send}
                  </Button>
                </>
              )}
              {editing && (
                <Button
                  tone="text"
                  onPress={() => {
                    setEditing(null);
                    setBody('');
                  }}
                >
                  {vi.api.cancel}
                </Button>
              )}
            </>
          ) : compact ? (
            <Pressable
              accessibilityRole="button"
              onPress={goToLogin}
              style={({ pressed }) => [styles.guestComposer, pressed && styles.pressed]}
            >
              <View style={styles.avatar}>
                <Icon name="person-outline" size={14} color={colors.textMuted} />
              </View>
              <Txt variant="small" style={styles.guestPlaceholder}>{vi.mobile.reelComments.placeholder}</Txt>
              <Txt variant="caption" style={styles.guestLogin}>{vi.api.login}</Txt>
            </Pressable>
          ) : (
            <Button onPress={goToLogin}>{vi.api.login}</Button>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  inlineComposer: { gap: spacing.lg },
  composer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  replyAvatar: { width: 22, height: 22 },
  commentBody: { flex: 1, minWidth: 0, borderWidth: 0, backgroundColor: colors.transparent, padding: 0, gap: 1 },
  author: { color: colors.textMuted, fontFamily: nativeFonts.semibold, lineHeight: 15 },
  message: { fontSize: 13, lineHeight: 17 },
  actions: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.sm, flexWrap: 'wrap' },
  date: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.5 },
  action: { minHeight: 26, justifyContent: 'center' },
  actionLabel: { color: colors.textMuted, fontFamily: nativeFonts.semibold, fontSize: 11, lineHeight: 15 },
  replies: { minHeight: 26, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  replyLine: { width: 18, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  replyThread: { marginTop: spacing.xs, gap: spacing.xs },
  guestComposer: {
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  guestPlaceholder: { color: colors.textMuted, flex: 1, fontSize: 12, lineHeight: 17 },
  guestLogin: { color: colors.tealInk, fontFamily: nativeFonts.semibold },
  muted: { color: colors.textMuted },
  replyingBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  replyingText: { flex: 1 },
});
