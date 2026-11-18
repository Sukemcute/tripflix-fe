import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { evictPostFromCache, socialApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { BottomSheet } from '../../components/bottom-sheet';
import { Button, Icon, IconButton, Txt, type IconName } from '../../components/mobile-ui';
import { ApiErrorNotice } from '../../components/api-state';
import { ReportButton } from './report-button';

export function PostOptionsMenu({
  postId,
  authorId,
  onDeleted,
  trigger,
}: {
  postId: string;
  authorId: string;
  onDeleted?: () => void;
  trigger?: (open: () => void) => ReactNode;
}) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<'menu' | 'visibility' | 'delete'>('menu');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const isMine = !!user && authorId === user.id;
  const detail = useQuery({
    queryKey: ['social', 'post', postId, user?.id],
    enabled: visible,
    queryFn: ({ signal }) => socialApi.getPost(postId, signal),
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationFn: async (action: 'save' | 'visibility' | 'delete') => {
      if (action === 'save') await socialApi.setBookmark(postId, !detail.data?.viewerContext.isBookmarked);
      else if (action === 'visibility') await socialApi.updatePost(postId, { visibility });
      else await socialApi.deletePost(postId);
    },
    onSuccess: async (_, action) => {
      setVisible(false);
      if (action === 'delete' || (action === 'visibility' && visibility === 'private'))
        evictPostFromCache(client, postId);
      if (action === 'delete') onDeleted?.();
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['feed'] }),
      ]);
    },
  });
  const open = () => {
    setView('menu');
    mutation.reset();
    setVisible(true);
  };
  const saved = !!detail.data?.viewerContext.isBookmarked;
  const disabled = detail.isPending || detail.isFetching || mutation.isPending || !detail.data;
  const close = () => {
    if (!mutation.isPending) setVisible(false);
  };
  return (
    <ReportButton
      targetType="post"
      targetId={postId}
      trigger={(openReport) => (
        <>
          {trigger ? (
            trigger(open)
          ) : (
            <IconButton name="ellipsis-horizontal" label={vi.api.postMoreOptions} onPress={open} />
          )}
          <BottomSheet
            visible={visible}
            compact
            title={
              view === 'menu'
                ? vi.api.postMoreOptions
                : view === 'visibility'
                  ? 'Chỉnh sửa quyền xem'
                  : 'Xóa bài viết?'
            }
            onClose={close}
          >
            <View style={{ gap: spacing.sm }}>
              <ApiErrorNotice error={detail.error ?? mutation.error} retry={() => void detail.refetch()} />
              {detail.isFetching && <Txt>{vi.api.loading}</Txt>}
              {view === 'menu' ? (
                <>
                  <Option
                    icon={saved ? 'bookmark' : 'bookmark-outline'}
                    title={saved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                    hint={saved ? 'Xóa khỏi mục Đã lưu' : 'Thêm vào mục Đã lưu'}
                    disabled={disabled}
                    onPress={() => {
                      if (!user) {
                        setVisible(false);
                        router.push({ pathname: '/login', params: { returnTo: `/trip/${postId}` } });
                      } else mutation.mutate('save');
                    }}
                  />
                  <View style={styles.separator} />
                  {isMine ? (
                    <>
                      <Option
                        icon="pencil-outline"
                        title="Chỉnh sửa bài viết"
                        disabled={disabled}
                        onPress={() => {
                          close();
                          router.push({ pathname: '/create', params: { postId } });
                        }}
                      />
                      <Option
                        icon="people-outline"
                        title="Chỉnh sửa quyền xem"
                        hint="Công khai hoặc chỉ mình tôi"
                        disabled={disabled}
                        onPress={() => {
                          setVisibility(detail.data?.post.visibility === 'private' ? 'private' : 'public');
                          setView('visibility');
                        }}
                      />
                      <View style={styles.separator} />
                      <Option
                        icon="trash-outline"
                        title="Xóa bài viết"
                        hint="Bài viết sẽ không còn hiển thị"
                        danger
                        disabled={disabled}
                        onPress={() => setView('delete')}
                      />
                    </>
                  ) : (
                    <Option
                      icon="flag-outline"
                      title="Báo cáo bài viết"
                      hint="Gửi cho đội ngũ kiểm duyệt"
                      onPress={() => {
                        close();
                        openReport();
                      }}
                    />
                  )}
                </>
              ) : view === 'visibility' ? (
                <>
                  <Txt>Ai có thể xem bài viết này?</Txt>
                  {(['public', 'private'] as const).map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: visibility === value, disabled: mutation.isPending }}
                      disabled={mutation.isPending}
                      onPress={() => setVisibility(value)}
                      style={styles.option}
                    >
                      <Icon
                        name={visibility === value ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={colors.tealInk}
                      />
                      <Txt>{value === 'public' ? 'Công khai' : 'Chỉ mình tôi'}</Txt>
                    </Pressable>
                  ))}
                  <Button disabled={disabled} onPress={() => mutation.mutate('visibility')}>
                    {mutation.isPending ? vi.api.saving : vi.api.save}
                  </Button>
                  <Button tone="text" disabled={mutation.isPending} onPress={() => setView('menu')}>
                    Quay lại
                  </Button>
                </>
              ) : (
                <>
                  <Txt>
                    Bạn muốn xóa “{detail.data?.post.title}”? Bài viết sẽ không còn hiển thị với người khác.
                  </Txt>
                  <Button disabled={disabled} onPress={() => mutation.mutate('delete')}>
                    {mutation.isPending ? vi.api.loading : 'Xóa bài viết'}
                  </Button>
                  <Button tone="text" disabled={mutation.isPending} onPress={() => setView('menu')}>
                    Hủy
                  </Button>
                </>
              )}
            </View>
          </BottomSheet>
        </>
      )}
    />
  );
}

function Option({
  icon,
  title,
  hint,
  onPress,
  danger,
  disabled,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { opacity: disabled ? 0.45 : 1, backgroundColor: pressed ? colors.surfaceMuted : colors.transparent },
      ]}
    >
      <Icon name={icon} size={24} color={danger ? colors.danger : colors.text} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="label" style={danger ? { color: colors.danger } : undefined}>
          {title}
        </Txt>
        {hint && (
          <Txt variant="caption" style={{ color: colors.textMuted }}>
            {hint}
          </Txt>
        )}
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: 12,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs },
});
