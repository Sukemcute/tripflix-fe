import type { DemoTripSlug } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors as c, nativeFonts as f, spacing as s } from '@tripflix/tokens';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Txt } from '@/components/mobile-ui';

const copy = vi.mobile.reelComments;
const REACTIONS = ['❤️', '😍', '🔥', '👏', '🥰', '🙌'] as const;
const INITIAL_COMMENT_COUNT = 7;
export { INITIAL_COMMENT_COUNT };

interface Comment {
  id: string;
  name: string;
  initials: string;
  text: string;
  age: string;
  likes: number;
  isLiked?: boolean;
  isCreator?: boolean;
  replyTo?: string;
  order: number;
}
interface CommentThread extends Comment {
  replies: Comment[];
}

function createThreads(slug: DemoTripSlug): CommentThread[] {
  const creatorName = slug === 'nha-trang' ? copy.creatorName : vi.demo.feed.creator;
  const creatorInitials = slug === 'nha-trang' ? copy.creatorInitials : vi.demo.feed.initials;
  const firstText =
    slug === 'hoi-an' ? copy.first.hoiAn : slug === 'da-nang' ? copy.first.daNang : copy.first.text;
  return [
    {
      id: 'first',
      name: copy.first.name,
      initials: copy.first.initials,
      text: firstText,
      age: copy.first.age,
      likes: 248,
      order: 4,
      replies: [
        {
          id: 'creator-first',
          name: creatorName,
          initials: creatorInitials,
          text: copy.creatorReply,
          age: copy.first.age,
          likes: 36,
          order: 5,
          isCreator: true,
        },
        {
          id: 'friend-first',
          name: copy.friendName,
          initials: copy.friendInitials,
          text: copy.friendReply,
          age: copy.first.age,
          likes: 12,
          order: 6,
        },
      ],
    },
    {
      id: 'second',
      name: copy.second.name,
      initials: copy.second.initials,
      text: copy.second.text,
      age: copy.second.age,
      likes: 86,
      order: 3,
      replies: [
        {
          id: 'creator-second',
          name: creatorName,
          initials: creatorInitials,
          text: copy.priceReply,
          age: copy.second.age,
          likes: 18,
          order: 4,
          isCreator: true,
        },
      ],
    },
    {
      id: 'third',
      name: copy.third.name,
      initials: copy.third.initials,
      text: copy.third.text,
      age: copy.third.age,
      likes: 32,
      order: 2,
      replies: [],
    },
    {
      id: 'fourth',
      name: copy.fourth.name,
      initials: copy.fourth.initials,
      text: copy.fourth.text,
      age: copy.fourth.age,
      likes: 19,
      order: 1,
      replies: [],
    },
  ];
}

export function ReelComments({
  visible,
  tripSlug,
  onClose,
  onCountChange,
}: {
  visible: boolean;
  tripSlug: DemoTripSlug;
  onClose: () => void;
  onCountChange: (slug: DemoTripSlug, count: number) => void;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const dialog = useRef<ComponentRef<typeof View>>(null);
  const nextId = useRef(1000);
  const initialThreads = useMemo(() => createThreads(tripSlug), [tripSlug]);
  const [byTrip, setByTrip] = useState<Partial<Record<DemoTripSlug, CommentThread[]>>>({});
  const [drafts, setDrafts] = useState<Partial<Record<DemoTripSlug, string>>>({});
  const [replyTargets, setReplyTargets] = useState<
    Partial<Record<DemoTripSlug, { threadId: string; name: string } | null>>
  >({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sort, setSort] = useState<'featured' | 'newest'>('featured');
  const threads = byTrip[tripSlug] ?? initialThreads;
  const draft = drafts[tripSlug] ?? '';
  const replyContext = replyTargets[tripSlug];
  const replyTarget = threads.find((thread) => thread.id === replyContext?.threadId);
  const count = threads.reduce((total, thread) => total + 1 + thread.replies.length, 0);
  const ordered = [...threads].sort((a, b) =>
    sort === 'newest' ? b.order - a.order : b.likes + Number(!!b.isLiked) - (a.likes + Number(!!a.isLiked)),
  );

  useEffect(() => {
    onCountChange(tripSlug, count);
  }, [tripSlug, count, onCountChange]);

  function close() {
    Keyboard.dismiss();
    onClose();
  }
  const drag = PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 12 && gesture.dy > Math.abs(gesture.dx),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 45) close();
    },
  });
  function updateThreads(update: (current: CommentThread[]) => CommentThread[]) {
    setByTrip((previous) => ({ ...previous, [tripSlug]: update(previous[tripSlug] ?? initialThreads) }));
  }
  function setDraft(value: string) {
    setDrafts((previous) => ({ ...previous, [tripSlug]: value }));
  }
  function toggleLike(id: string) {
    updateThreads((current) =>
      current.map((thread) =>
        thread.id === id
          ? { ...thread, isLiked: !thread.isLiked }
          : {
              ...thread,
              replies: thread.replies.map((reply) =>
                reply.id === id ? { ...reply, isLiked: !reply.isLiked } : reply,
              ),
            },
      ),
    );
  }
  function startReply(thread: CommentThread, comment: Comment) {
    setReplyTargets((previous) => ({ ...previous, [tripSlug]: { threadId: thread.id, name: comment.name } }));
    input.current?.focus();
  }
  function send() {
    const text = draft.trim();
    if (!text || text.length > 500) return;
    const comment: Comment = {
      id: `local-${++nextId.current}`,
      name: copy.you,
      initials: copy.yourInitials,
      replyTo: replyContext?.name,
      text,
      age: copy.justNow,
      likes: 0,
      order: nextId.current,
    };
    if (replyTarget) {
      updateThreads((current) =>
        current.map((thread) =>
          thread.id === replyTarget.id ? { ...thread, replies: [...thread.replies, comment] } : thread,
        ),
      );
      setExpanded((previous) => ({ ...previous, [`${tripSlug}:${replyTarget.id}`]: true }));
    } else {
      updateThreads((current) => [...current, { ...comment, replies: [] }]);
    }
    setDraft('');
    setReplyTargets((previous) => ({ ...previous, [tripSlug]: null }));
    if (!replyTarget && sort === 'featured')
      requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
    if (!replyTarget && sort === 'newest') list.current?.scrollTo({ y: 0, animated: true });
  }

  function renderComment(comment: Comment, thread: CommentThread, isReply = false) {
    return (
      <View key={comment.id} style={[styles.comment, isReply && styles.replyComment]}>
        <View
          style={[
            styles.avatar,
            comment.isCreator
              ? styles.creatorAvatar
              : comment.initials === copy.second.initials
                ? styles.sunAvatar
                : styles.mintAvatar,
            isReply && styles.replyAvatar,
          ]}
        >
          <Txt style={styles.initials}>{comment.initials}</Txt>
        </View>
        <View style={styles.commentBody}>
          <View style={styles.nameLine}>
            <Txt style={styles.name}>{comment.name}</Txt>
            {comment.isCreator && (
              <View style={styles.creatorTag}>
                <Txt style={styles.creatorText}>{copy.creator}</Txt>
              </View>
            )}
          </View>
          <Txt style={styles.message}>
            {comment.replyTo && <Txt style={styles.mention}>@{comment.replyTo} </Txt>}
            {comment.text}
          </Txt>
          <View style={styles.metadata}>
            <Txt style={styles.age}>{comment.age}</Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${copy.reply} ${comment.name}`}
              onPress={() => startReply(thread, comment)}
              style={styles.replyAction}
            >
              <Txt style={styles.replyLabel}>{copy.reply}</Txt>
            </Pressable>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(comment.isLiked ? 'mobile.reelComments.unlike' : 'mobile.reelComments.like', {
            name: comment.name,
          })}
          accessibilityState={{ selected: !!comment.isLiked }}
          onPress={() => toggleLike(comment.id)}
          style={styles.likeAction}
        >
          <Icon
            name={comment.isLiked ? 'heart' : 'heart-outline'}
            size={19}
            color={comment.isLiked ? c.coralInk : c.textMuted}
          />
          <Txt style={[styles.likeCount, comment.isLiked && { color: c.coralInk }]}>
            {new Intl.NumberFormat('vi-VN').format(comment.likes + Number(!!comment.isLiked))}
          </Txt>
        </Pressable>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
      onShow={() => dialog.current?.focus()}
    >
      <View style={styles.overlay}>
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          style={styles.keyboard}
          pointerEvents="box-none"
        >
          <View
            ref={dialog}
            accessibilityViewIsModal
            accessibilityLabel={t('mobile.reelComments.title', { count })}
            style={[styles.panel, { height: Math.min(720, height * 0.81) }]}
          >
            <View {...drag.panHandlers} style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
            <View style={styles.heading}>
              <View style={styles.headingSpacer} />
              <Txt style={styles.title}>{t('mobile.reelComments.title', { count })}</Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.close}
                onPress={close}
                style={styles.close}
              >
                <Icon name="close" size={23} />
              </Pressable>
            </View>
            <View style={styles.sortBar}>
              {(['featured', 'newest'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: sort === value }}
                  onPress={() => setSort(value)}
                  style={[styles.sortTab, sort === value && styles.selectedTab]}
                >
                  <Txt style={[styles.sortText, sort === value && styles.selectedText]}>{copy[value]}</Txt>
                </Pressable>
              ))}
            </View>
            <ScrollView
              ref={list}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {ordered.map((thread) => {
                const key = `${tripSlug}:${thread.id}`;
                return (
                  <View key={thread.id} style={styles.thread}>
                    {renderComment(thread, thread)}
                    {thread.replies.length > 0 && (
                      <View style={styles.replies}>
                        {expanded[key] && thread.replies.map((reply) => renderComment(reply, thread, true))}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ expanded: !!expanded[key] }}
                          onPress={() => setExpanded((previous) => ({ ...previous, [key]: !previous[key] }))}
                          style={styles.expandReplies}
                        >
                          <View style={styles.replyLine} />
                          <Txt style={styles.expandLabel}>
                            {expanded[key]
                              ? copy.hideReplies
                              : t('mobile.reelComments.showReplies', { count: thread.replies.length })}
                          </Txt>
                          <Icon
                            name={expanded[key] ? 'chevron-up' : 'chevron-down'}
                            size={12}
                            color={c.textMuted}
                          />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <View style={[styles.composer, { paddingBottom: Math.max(12, insets.bottom) }]}>
              {replyTarget && (
                <View style={styles.replying}>
                  <Txt style={styles.replyingText}>
                    {t('mobile.reelComments.replying', { name: replyContext?.name ?? replyTarget.name })}
                  </Txt>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={copy.cancelReply}
                    onPress={() => setReplyTargets((previous) => ({ ...previous, [tripSlug]: null }))}
                    style={styles.cancelReply}
                  >
                    <Icon name="close" size={16} color={c.textMuted} />
                  </Pressable>
                </View>
              )}
              <View style={styles.reactions}>
                {REACTIONS.map((reaction) => (
                  <Pressable
                    key={reaction}
                    accessibilityRole="button"
                    accessibilityLabel={t('mobile.reelComments.reaction', { reaction })}
                    onPress={() => {
                      if (draft.length + reaction.length <= 500) setDraft(draft + reaction);
                      input.current?.focus();
                    }}
                    style={styles.reaction}
                  >
                    <Txt style={styles.reactionText}>{reaction}</Txt>
                  </Pressable>
                ))}
              </View>
              <View style={styles.inputRow}>
                <View style={[styles.avatar, styles.selfAvatar]}>
                  <Txt style={styles.selfInitials}>{copy.yourInitials}</Txt>
                </View>
                <TextInput
                  ref={input}
                  accessibilityLabel={copy.input}
                  placeholder={
                    replyTarget
                      ? `${copy.reply} ${replyContext?.name ?? replyTarget.name}…`
                      : copy.placeholder
                  }
                  placeholderTextColor={c.textMuted}
                  value={draft}
                  onChangeText={setDraft}
                  maxLength={500}
                  multiline
                  textAlignVertical="center"
                  style={styles.input}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.send}
                  accessibilityState={{ disabled: !draft.trim() }}
                  disabled={!draft.trim()}
                  onPress={send}
                  style={[styles.send, !draft.trim() && styles.sendDisabled]}
                >
                  <Icon name="arrow-up" size={20} color={draft.trim() ? c.background : c.textSubtle} />
                </Pressable>
              </View>
              <Txt style={styles.preview}>{copy.preview}</Txt>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: c.overlay },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '100%',
    alignSelf: 'center',
    backgroundColor: c.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleArea: { height: 24, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 44,
  },
  headingSpacer: { width: 44 },
  title: { fontFamily: f.bold, fontSize: 15, lineHeight: 22 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sortBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  sortTab: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: c.background,
  },
  selectedTab: { backgroundColor: c.surfaceMuted },
  sortText: { fontSize: 12, lineHeight: 18, fontFamily: f.medium, color: c.textMuted },
  selectedText: { color: c.ink, fontFamily: f.semibold },
  list: { flex: 1 },
  listContent: { paddingTop: 20, paddingBottom: 12, paddingHorizontal: 16 },
  thread: { marginBottom: 16 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  mintAvatar: { backgroundColor: c.seaMist },
  sunAvatar: { backgroundColor: c.sunSoft },
  creatorAvatar: { backgroundColor: c.coralTint },
  initials: { fontSize: 11, fontFamily: f.semibold, color: c.tealInk },
  commentBody: { flex: 1, minWidth: 0 },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    minHeight: 18,
    marginBottom: 3,
  },
  name: { fontSize: 12, lineHeight: 18, fontFamily: f.semibold, color: c.textMuted },
  creatorTag: { backgroundColor: c.coralTint, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  creatorText: { fontSize: 9, lineHeight: 14, fontFamily: f.semibold, color: c.coralInk },
  message: { fontSize: 14, lineHeight: 21, color: c.ink },
  mention: { fontSize: 14, lineHeight: 21, color: c.tealInk },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  age: { fontSize: 11, lineHeight: 18, color: c.textMuted },
  replyAction: { minHeight: 32, justifyContent: 'center', paddingRight: 10 },
  replyLabel: { fontSize: 11, lineHeight: 18, fontFamily: f.semibold, color: c.textMuted },
  likeAction: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 4,
  },
  likeCount: { fontSize: 10, lineHeight: 15, color: c.textMuted },
  replies: { marginLeft: 46 },
  replyComment: { gap: 8, marginTop: 12 },
  replyAvatar: { width: 26, height: 26, borderRadius: 13 },
  expandReplies: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 },
  replyLine: { width: 20, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  expandLabel: { fontSize: 11, lineHeight: 18, fontFamily: f.semibold, color: c.textMuted },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.background,
    paddingHorizontal: 16,
  },
  replying: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  replyingText: { fontSize: 11, lineHeight: 18, color: c.textMuted, flex: 1 },
  cancelReply: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  reactions: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  reaction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  reactionText: { fontSize: 24, lineHeight: 34 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  selfAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.sunSoft },
  selfInitials: { fontSize: 10, fontFamily: f.bold, color: c.ink },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 22,
    backgroundColor: c.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    lineHeight: 20,
    color: c.ink,
    fontFamily: f.regular,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.coralInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: c.surfaceMuted },
  preview: { fontSize: 10, lineHeight: 16, color: c.textMuted, marginLeft: 38, marginTop: s.sm },
});
