import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { POST_MEDIA_LIMITS } from '@tripflix/app-core';
import { socialApi, uploadVideo, useApiSession } from '@tripflix/api-client';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { toPickedVideo, type PickedVideo } from './video-source';
import {
  Button,
  Chip,
  copy,
  Field,
  Icon,
  IconButton,
  Notice,
  Row,
  Screen,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { ApiErrorNotice, RequireAccount } from '@/components/api-state';

export function LiveCreateScreen() {
  const { user, isReady } = useApiSession();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const query = useQuery({
    queryKey: ['social', 'edit', postId, user?.id],
    enabled: isReady && !!user && !!postId,
    queryFn: ({ signal }) => socialApi.getPost(postId!, signal),
  });
  if (!isReady || !user) return <RequireAccount />;
  if (postId && !query.data)
    return (
      <Screen title={vi.api.create}>
        <ApiErrorNotice
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
        {query.isPending && <Txt>{vi.api.loading}</Txt>}
      </Screen>
    );
  return <DraftEditor key={postId ?? 'new'} post={query.data?.post} />;
}
function DraftEditor({ post }: { post?: SocialPostDto }) {
  const client = useQueryClient();
  const [id, setId] = useState(post?.id);
  const [title, setTitle] = useState(post?.title ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [hashtags, setHashtags] = useState(post?.hashtags.join(', ') ?? '');
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    post?.visibility === 'private' ? 'private' : 'public',
  );
  const [video, setVideo] = useState<PickedVideo | null>(null);
  // Video đã tải lên ở lần bấm trước (ví dụ tải xong nhưng tạo bài lỗi): không tải lại.
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [isPicking, setPicking] = useState(false);
  const uploadAbort = useRef<AbortController | null>(null);
  useEffect(() => () => uploadAbort.current?.abort(), []);

  async function pickVideo() {
    setPicking(true);
    setPickerError(null);
    try {
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: POST_MEDIA_LIMITS.videoDurationMs / 1000,
      });
      const asset = selection.canceled ? undefined : selection.assets[0];
      if (!asset) return;
      const picked = await toPickedVideo(asset);
      if (typeof picked === 'string') return setPickerError(copy.create[picked]);
      if (picked.durationMs > POST_MEDIA_LIMITS.videoDurationMs) return setPickerError(copy.create.tooLong);
      setVideo(picked);
      setUploadedAssetId(null);
    } catch {
      setPickerError(copy.create.pickerError);
    } finally {
      setPicking(false);
    }
  }

  async function uploadSelectedVideo(): Promise<string | undefined> {
    if (!video) return undefined;
    if (uploadedAssetId) return uploadedAssetId;
    const controller = new AbortController();
    uploadAbort.current = controller;
    setUploadPercent(0);
    try {
      const assetId = await uploadVideo(video, {
        signal: controller.signal,
        onProgress: (done, total) => setUploadPercent(Math.floor((done / total) * 100)),
      });
      setUploadedAssetId(assetId);
      return assetId;
    } finally {
      setUploadPercent(null);
    }
  }

  const mutation = useMutation({
    mutationFn: async (action: 'save' | 'publish') => {
      const assetId = await uploadSelectedVideo();
      const draft = {
        title: title.trim(),
        body,
        hashtags: hashtags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        visibility,
        ...(assetId ? { media_ids: [assetId] } : {}),
      };
      const savedPost = await (id
        ? socialApi.updatePost(id, draft)
        : socialApi.createDraft({ ...draft, post_type: assetId ? 'video' : 'vlog' }));
      setId(savedPost.id);
      if (action === 'publish' && savedPost.status === 'draft') await socialApi.publishPost(savedPost.id);
      return savedPost;
    },
    onSuccess: async (savedPost) => {
      setId(savedPost.id);
      await client.invalidateQueries({ queryKey: ['social'] });
    },
  });
  const isBusy = mutation.isPending || isPicking;
  const videoLabel = video ? copy.create.videoSelected : copy.create.selectVideo;
  const videoDetail =
    uploadPercent !== null
      ? t('mobile.create.uploadingVideo', { percent: uploadPercent })
      : video
        ? t('mobile.create.videoInfo', {
            duration: formatDuration(video.durationMs),
            size: (video.sizeBytes / 1_000_000).toFixed(1),
          })
        : copy.create.videoHint;
  return (
    <Screen
      title={copy.create.title}
      footer={
        <View style={styles.actions}>
          <Button
            tone="secondary"
            style={styles.draft}
            disabled={mutation.isPending || !title.trim()}
            onPress={() => mutation.mutate('save')}
          >
            {mutation.isPending && mutation.variables === 'save'
              ? vi.api.saving
              : id
                ? vi.api.save
                : copy.create.saveDraftShort}
          </Button>
          <Button
            icon="paper-plane-outline"
            style={styles.publish}
            disabled={mutation.isPending || !title.trim() || !body.trim()}
            onPress={() => mutation.mutate('publish')}
          >
            {vi.api.publish}
          </Button>
        </View>
      }
    >
      <View style={styles.form}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={video ? copy.create.changeVideo : copy.create.selectVideo}
          accessibilityHint={videoDetail}
          disabled={isBusy}
          onPress={() => {
            void pickVideo();
          }}
          style={({ pressed }) => [styles.media, video && styles.mediaSelected, pressed && styles.pressed]}
        >
          <View style={styles.mediaIcon}>
            <Icon name={video ? 'film-outline' : 'add'} size={24} color={colors.tealInk} />
          </View>
          <View style={styles.mediaText}>
            <Txt variant="label" numberOfLines={1}>
              {isPicking ? copy.create.selecting : videoLabel}
            </Txt>
            <Txt
              variant="caption"
              numberOfLines={1}
              style={ui.muted}
              accessibilityLiveRegion={uploadPercent !== null ? 'polite' : 'none'}
            >
              {videoDetail}
            </Txt>
            {uploadPercent !== null && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${uploadPercent}%` }]} />
              </View>
            )}
          </View>
          {video && !mutation.isPending && (
            <IconButton
              name="close"
              label={copy.create.remove}
              onPress={() => {
                setVideo(null);
                setUploadedAssetId(null);
              }}
            />
          )}
        </Pressable>
        {pickerError && <Notice tone="error">{pickerError}</Notice>}
        <Field label={vi.api.title} value={title} onChangeText={setTitle} maxLength={255} />
        <Field
          label={copy.create.story}
          placeholder={copy.create.placeholder}
          value={body}
          onChangeText={setBody}
          multiline
          style={styles.story}
        />
        <Field
          label={copy.create.hashtagsLabel}
          placeholder={copy.create.hashtagsPlaceholder}
          value={hashtags}
          onChangeText={setHashtags}
          autoCapitalize="none"
        />
        <View style={styles.visibility}>
          <Txt variant="label">{copy.create.visibility}</Txt>
          <Row style={styles.chips}>
            <Chip selected={visibility === 'public'} onPress={() => setVisibility('public')}>
              {vi.api.public}
            </Chip>
            <Chip selected={visibility === 'private'} onPress={() => setVisibility('private')}>
              {vi.api.private}
            </Chip>
          </Row>
        </View>
        {mutation.error && video && !uploadedAssetId ? (
          <Notice tone="error">{copy.create.uploadFailed}</Notice>
        ) : (
          <ApiErrorNotice error={mutation.error} />
        )}
        {mutation.isSuccess && (
          <Notice>
            {mutation.variables === 'publish' ? vi.api.published : vi.api.draftSaved}
            {uploadedAssetId ? ` ${copy.create.videoProcessing}` : ''}
          </Notice>
        )}
        {id && (
          <Button tone="text" onPress={() => router.push({ pathname: '/trip/[slug]', params: { slug: id } })}>
            {vi.api.detail}
          </Button>
        )}
      </View>
    </Screen>
  );
}

function formatDuration(durationMs: number) {
  const seconds = Math.round(durationMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  media: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: mobileLayout.cardRadius,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textSubtle,
  },
  mediaSelected: { borderStyle: 'solid', borderColor: colors.border, backgroundColor: colors.warmMist },
  pressed: { opacity: 0.7 },
  mediaIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.seaMist,
  },
  mediaText: { flex: 1, gap: spacing.xs },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: colors.tealInk },
  story: { minHeight: 88, textAlignVertical: 'top' },
  visibility: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  chips: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  draft: { flex: 1 },
  publish: { flex: 2 },
});
