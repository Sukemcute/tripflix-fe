import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buildTripAttachment,
  EMPTY_TRIP_PLAN_DAY,
  getPostCaption,
  getPostTitleFromCaption,
  POST_MEDIA_LIMITS,
  type TripPlanDraft,
} from '@tripflix/app-core';
import { socialApi, uploadVideo, useApiSession } from '@tripflix/api-client';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, Switch, View } from 'react-native';
import { TripPlanEditor } from './trip-plan-editor';
import { startVideoCompression, type VideoCompression } from './video-compress';
import { toPickedVideo, type PickedVideo } from './video-source';
import {
  Button,
  Chip,
  copy,
  Field,
  Icon,
  IconButton,
  Mascot,
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
  // Chỉ có caption; tiêu đề core bắt buộc được lấy từ dòng đầu caption khi lưu.
  const [body, setBody] = useState(post ? getPostCaption(post.title, post.body) : '');
  const [hashtags, setHashtags] = useState(post?.hashtags.join(', ') ?? '');
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    post?.visibility === 'private' ? 'private' : 'public',
  );
  const [video, setVideo] = useState<PickedVideo | null>(null);
  // Video đã tải lên ở lần bấm trước (ví dụ tải xong nhưng tạo bài lỗi): không tải lại.
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  // Nén ngay sau khi chọn, chạy trong lúc người dùng viết bài; bấm đăng thì chờ nén xong rồi tải lên.
  const compression = useRef<VideoCompression | null>(null);
  const [compressPercent, setCompressPercent] = useState<number | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [isPicking, setPicking] = useState(false);
  // Đăng kèm lộ trình là tuỳ chọn; tắt thì đăng như bài thường.
  const [hasTripPlan, setHasTripPlan] = useState(false);
  const [tripDraft, setTripDraft] = useState<TripPlanDraft>({
    destinationName: '',
    hotel: null,
    days: [EMPTY_TRIP_PLAN_DAY],
  });
  const uploadAbort = useRef<AbortController | null>(null);
  // Đăng xong thì thay cả form bằng màn báo đã đăng, để không ai bấm đăng lại hay tưởng chưa đăng.
  const [published, setPublished] = useState<{ id: string; hasVideo: boolean } | null>(null);
  // Video đã tải xong thì bài sẽ được tạo dù người dùng rời màn, nên lúc đó không cho huỷ nữa.
  const [isUploadDone, setUploadDone] = useState(false);
  useEffect(
    () => () => {
      uploadAbort.current?.abort();
      compression.current?.dispose();
    },
    [],
  );

  function selectVideo(next: PickedVideo | null) {
    compression.current?.dispose();
    compression.current = null;
    setCompressPercent(null);
    setVideo(next);
    setUploadedAssetId(null);
    if (!next) return;
    const job = startVideoCompression(next, (percent) => {
      if (compression.current === job) setCompressPercent(percent);
    });
    compression.current = job;
    if (!job.compressing) return;
    setCompressPercent(0);
    void job.result.then((prepared) => {
      if (compression.current !== job) return;
      setCompressPercent(null);
      setVideo(prepared);
    });
  }

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
      selectVideo(picked);
    } catch {
      setPickerError(copy.create.pickerError);
    } finally {
      setPicking(false);
    }
  }

  async function uploadSelectedVideo(): Promise<string | undefined> {
    if (!video) return undefined;
    if (uploadedAssetId) return uploadedAssetId;
    const job = compression.current;
    const source = job ? await job.result : video;
    if (job && compression.current !== job) throw new Error('Video đã được đổi trong lúc nén');
    const controller = new AbortController();
    uploadAbort.current = controller;
    setUploadPercent(0);
    try {
      const assetId = await uploadVideo(source, {
        signal: controller.signal,
        onProgress: (done, total) => setUploadPercent(Math.floor((done / total) * 100)),
      });
      setUploadedAssetId(assetId);
      // Đã tải lên xong thì xoá file nén tạm; tải lỗi thì giữ để lần bấm sau không phải nén lại.
      job?.dispose();
      return assetId;
    } finally {
      setUploadPercent(null);
    }
  }

  const mutation = useMutation({
    mutationFn: async (action: 'save' | 'publish') => {
      setUploadDone(false);
      const assetId = await uploadSelectedVideo();
      setUploadDone(true);
      const tripAttachment = hasTripPlan ? buildTripAttachment(tripDraft, vi.mobile.tripPlan.modes) : null;
      const draft = {
        title: getPostTitleFromCaption(body),
        body: body.trim(),
        hashtags: hashtags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        visibility,
        ...(assetId ? { media_ids: [assetId] } : {}),
        ...(tripAttachment ? { trip_attachment: tripAttachment } : {}),
      };
      const savedPost = await (id
        ? socialApi.updatePost(id, draft)
        : socialApi.createDraft({ ...draft, post_type: assetId ? 'video' : 'vlog' }));
      setId(savedPost.id);
      if (action === 'publish' && savedPost.status === 'draft') await socialApi.publishPost(savedPost.id);
      return savedPost;
    },
    onSuccess: async (savedPost, action) => {
      setId(savedPost.id);
      if (action === 'publish') {
        Keyboard.dismiss();
        setPublished({ id: savedPost.id, hasVideo: savedPost.postType === 'video' });
      }
      await client.invalidateQueries({ queryKey: ['social'] });
    },
  });
  const isBusy = mutation.isPending || isPicking;
  const navigation = useNavigation();
  // Đang đăng hay lưu mà bấm quay lại, vuốt mép hay nút back Android: hỏi trước, không thoát ngay.
  usePreventRemove(mutation.isPending, ({ data }) => {
    const title =
      mutation.variables === 'save' ? copy.create.leaveSavingTitle : copy.create.leavePublishingTitle;
    if (isUploadDone) {
      Alert.alert(title, copy.create.leaveAlmostDone, [{ text: copy.create.stay }]);
      return;
    }
    Alert.alert(title, copy.create.leaveWillCancel, [
      { text: copy.create.stay, style: 'cancel' },
      {
        text: copy.create.cancelAndLeave,
        style: 'destructive',
        onPress: () => {
          uploadAbort.current?.abort();
          compression.current?.dispose();
          navigation.dispatch(data.action);
        },
      },
    ]);
  });
  const progressPercent = uploadPercent ?? compressPercent;
  const videoLabel = video ? copy.create.videoSelected : copy.create.selectVideo;
  const videoDetail =
    uploadPercent !== null
      ? t('mobile.create.uploadingVideo', { percent: uploadPercent })
      : compressPercent !== null
        ? t('mobile.create.compressingVideo', { percent: compressPercent })
        : video
          ? t('mobile.create.videoInfo', {
              duration: formatDuration(video.durationMs),
              size: (video.sizeBytes / 1_000_000).toFixed(1),
            })
          : copy.create.videoHint;
  if (published) return <PublishedView postId={published.id} hasVideo={published.hasVideo} />;
  const isSaving = mutation.isPending && mutation.variables === 'save';
  const isPublishing = mutation.isPending && mutation.variables === 'publish';
  return (
    <Screen
      title={copy.create.title}
      footer={
        <View style={styles.footer}>
          {/* Ngay trên nút bấm, không bị bàn phím hay thanh nút che như khi nằm cuối form. */}
          {mutation.error && video && !uploadedAssetId ? (
            <Notice tone="error">{copy.create.uploadFailed}</Notice>
          ) : (
            <ApiErrorNotice error={mutation.error} />
          )}
          {mutation.isSuccess && mutation.variables === 'save' && <Notice>{vi.api.draftSaved}</Notice>}
          <View style={styles.actions}>
            <Button
              tone="secondary"
              style={styles.draft}
              disabled={mutation.isPending || !body.trim()}
              onPress={() => mutation.mutate('save')}
            >
              {isSaving ? vi.api.saving : id ? vi.api.save : copy.create.saveDraftShort}
            </Button>
            <Button
              icon="paper-plane-outline"
              style={styles.publish}
              disabled={mutation.isPending || !body.trim()}
              onPress={() => mutation.mutate('publish')}
            >
              {isPublishing ? copy.create.publishing : vi.api.publish}
            </Button>
          </View>
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
              accessibilityLiveRegion={progressPercent !== null ? 'polite' : 'none'}
            >
              {videoDetail}
            </Txt>
            {progressPercent !== null && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            )}
          </View>
          {video && !mutation.isPending && (
            <IconButton name="close" label={copy.create.remove} onPress={() => selectVideo(null)} />
          )}
        </Pressable>
        {pickerError && <Notice tone="error">{pickerError}</Notice>}
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
        <View style={styles.tripToggle}>
          <View style={styles.mediaText}>
            <Txt variant="label">{vi.mobile.tripPlan.editor.toggle}</Txt>
            <Txt variant="caption" style={ui.muted}>
              {vi.mobile.tripPlan.editor.toggleHint}
            </Txt>
          </View>
          <Switch
            accessibilityLabel={vi.mobile.tripPlan.editor.toggle}
            value={hasTripPlan}
            onValueChange={setHasTripPlan}
            trackColor={{ true: colors.tealInk, false: colors.border }}
          />
        </View>
        {hasTripPlan && <TripPlanEditor draft={tripDraft} onChange={setTripDraft} />}
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
        {id && (
          <Button tone="text" onPress={() => router.push({ pathname: '/trip/[slug]', params: { slug: id } })}>
            {vi.api.detail}
          </Button>
        )}
      </View>
    </Screen>
  );
}

function PublishedView({ postId, hasVideo }: { postId: string; hasVideo: boolean }) {
  return (
    <Screen
      title={copy.create.title}
      back={false}
      footer={
        <View style={styles.footer}>
          <Button
            icon="eye-outline"
            onPress={() => router.replace({ pathname: '/trip/[slug]', params: { slug: postId } })}
          >
            {copy.create.viewPost}
          </Button>
          <Button
            tone="secondary"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          >
            {copy.create.done}
          </Button>
        </View>
      }
    >
      <View style={styles.published} testID="post-published">
        <Mascot pose="celebrate" size={132} />
        <Txt variant="title" style={styles.publishedTitle} accessibilityRole="header">
          {copy.create.publishedTitle}
        </Txt>
        <Txt style={styles.publishedBody}>
          {hasVideo ? copy.create.publishedVideoBody : copy.create.publishedBody}
        </Txt>
        <Button tone="text" onPress={() => router.replace('/create')}>
          {copy.create.postAnother}
        </Button>
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
  tripToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footer: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  published: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  publishedTitle: { textAlign: 'center' },
  publishedBody: { textAlign: 'center', color: colors.textMuted },
  draft: { flex: 1 },
  publish: { flex: 2 },
});
