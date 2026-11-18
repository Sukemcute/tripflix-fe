import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buildTripAttachment,
  buildTripDraftFromAttachment,
  createTripPlanDraft,
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
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { startPostUpload } from './post-upload-store';
import { TripPlanEditor } from './trip-plan-editor';
import { startVideoCompression, type VideoCompression } from './video-compress';
import { toPickedVideo, type PickedVideo } from './video-source';
import {
  Button,
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
import { LoadingDots } from '@/components/loading-dots';

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
        {query.isPending && <LoadingDots />}
      </Screen>
    );
  return <DraftEditor key={postId ?? 'new'} post={query.data?.post} />;
}
function DraftEditor({ post }: { post?: SocialPostDto }) {
  const client = useQueryClient();
  const [id, setId] = useState(post?.id);
  // Tiêu đề riêng như web; để trống thì lấy dòng đầu caption (core bắt buộc có tiêu đề).
  const [title, setTitle] = useState(post?.title ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const postTitle = title.trim() || getPostTitleFromCaption(body);
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
  // Đăng theo từng bước (TF105): xem lại video → chi tiết bài → (tuỳ chọn) soạn lộ trình.
  const [step, setStep] = useState<'video' | 'details' | 'trip'>(post ? 'details' : 'video');
  // Đăng kèm lộ trình là tuỳ chọn; chưa mở bước lộ trình thì đăng như bài thường.
  // Sửa bài cũ thì nạp lại lộ trình đã lưu, để lưu lại không mất giờ, khách sạn, chặng bay, loại gợi ý.
  const [hasTripPlan, setHasTripPlan] = useState(!!post?.tripAttachment);
  const [tripDraft, setTripDraft] = useState<TripPlanDraft>(() =>
    post?.tripAttachment
      ? buildTripDraftFromAttachment(post.tripAttachment, vi.mobile.tripPlan.modes)
      : createTripPlanDraft(),
  );
  const [isDraggingPoint, setDraggingPoint] = useState(false);
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
        title: postTitle,
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
  // Đăng (TF105): giao việc nén, tải video và đăng bài cho tiến trình nền rồi về màn chính ngay.
  function publishInBackground() {
    if (!body.trim() || mutation.isPending) return;
    const tripAttachment = hasTripPlan ? buildTripAttachment(tripDraft, vi.mobile.tripPlan.modes) : null;
    startPostUpload(postTitle, {
      postId: id,
      draft: {
        title: postTitle,
        body: body.trim(),
        hashtags: hashtags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        visibility,
        ...(tripAttachment ? { trip_attachment: tripAttachment } : {}),
      },
      video,
      // Tiến trình nền giữ file nén; màn này đóng lại không được xoá nó.
      compression: compression.current,
      uploadedAssetId,
      client,
    });
    compression.current = null;
    Keyboard.dismiss();
    router.replace('/(tabs)');
  }
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
  const tripAttachment = hasTripPlan ? buildTripAttachment(tripDraft, vi.mobile.tripPlan.modes) : null;
  const tripSummary = tripAttachment
    ? [
        tripAttachment.destinationName,
        t('mobile.tripPlan.dayCount', { days: tripAttachment.daysCount }),
        t('mobile.tripPlan.editor.bookableCount', {
          count: tripAttachment.items.filter((item) => item.transport?.fromAirport || item.hotel).length,
        }),
      ]
        .filter(Boolean)
        .join(' · ')
    : copy.create.tripAdd;

  if (step === 'video') {
    return (
      <VideoStep
        video={video}
        isPicking={isPicking}
        progressPercent={progressPercent}
        detail={videoDetail}
        error={pickerError}
        onPick={() => {
          void pickVideo();
        }}
        onNext={() => setStep('details')}
      />
    );
  }

  if (step === 'trip') {
    return (
      <Screen
        scroll={false}
        padded={false}
        header={
          <StepHeader
            title={vi.mobile.tripPlan.editor.toggle}
            onBack={() => setStep('details')}
            right={
              <Button tone="text" onPress={() => setStep('details')}>
                {copy.create.tripDone}
              </Button>
            }
          />
        }
        footer={
          <View style={styles.actions}>
            <Button
              compact
              tone="secondary"
              style={styles.draft}
              onPress={() => {
                setHasTripPlan(false);
                setTripDraft(createTripPlanDraft());
                setStep('details');
              }}
            >
              {copy.create.tripRemove}
            </Button>
            <Button compact style={styles.publish} onPress={() => setStep('details')}>
              {copy.create.tripDone}
            </Button>
          </View>
        }
      >
        {/* Cuộn riêng để khoá cuộn lúc đang kéo thẻ, không thì danh sách vừa cuộn vừa kéo. */}
        <ScrollView
          scrollEnabled={!isDraggingPoint}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[ui.content, ui.pad]}
          showsVerticalScrollIndicator={false}
        >
          <TripPlanEditor draft={tripDraft} onChange={setTripDraft} onDragChange={setDraggingPoint} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen
      header={<StepHeader title={copy.create.title} onBack={post ? undefined : () => setStep('video')} />}
      footer={
        <View style={styles.footer}>
          {/* Ngay trên nút bấm, không bị bàn phím hay thanh nút che như khi nằm cuối form. */}
          {mutation.error && video && !uploadedAssetId ? (
            <Notice tone="error">{copy.create.uploadFailed}</Notice>
          ) : (
            <ApiErrorNotice error={mutation.error} />
          )}
          {mutation.isSuccess && mutation.variables === 'save' && <Notice>{vi.api.draftSaved}</Notice>}
          {progressPercent !== null && (
            <Txt variant="caption" style={ui.muted} accessibilityLiveRegion="polite">
              {videoDetail}
            </Txt>
          )}
          <View style={styles.actions}>
            <Button
              compact
              tone="secondary"
              icon="document-outline"
              style={styles.draft}
              disabled={mutation.isPending || !body.trim()}
              onPress={() => mutation.mutate('save')}
            >
              {isSaving ? vi.api.saving : id ? copy.create.saveShort : copy.create.draftShort}
            </Button>
            <Button
              compact
              icon="arrow-up-circle-outline"
              style={styles.publish}
              disabled={mutation.isPending || !body.trim()}
              onPress={publishInBackground}
            >
              {isPublishing ? copy.create.publishing : vi.api.publish}
            </Button>
          </View>
        </View>
      }
    >
      <View style={styles.form}>
        <Field
          label={copy.create.titleLabel}
          placeholder={copy.create.titlePlaceholder}
          value={title}
          maxLength={255}
          onChangeText={setTitle}
        />
        <View style={styles.captionBlock}>
          <Txt variant="label">{copy.create.story}</Txt>
          <Row style={styles.captionRow}>
            <TextInput
              accessibilityLabel={copy.create.story}
              placeholder={copy.create.placeholder}
              placeholderTextColor={colors.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
              style={[ui.input, styles.storyBox]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={video ? copy.create.changeVideo : copy.create.selectVideo}
              disabled={isBusy || !!post}
              onPress={() => setStep('video')}
              style={({ pressed }) => [styles.thumb, pressed && styles.pressed]}
            >
              {video ? (
                <VideoThumb uri={video.uri} />
              ) : (
                <Icon name="film-outline" size={24} color={colors.tealInk} />
              )}
              {!post && (
                <View style={styles.thumbLabel}>
                  <Txt style={styles.thumbLabelText}>{copy.create.preview}</Txt>
                </View>
              )}
            </Pressable>
          </Row>
        </View>
        <Field
          label={copy.create.hashtagsLabel}
          placeholder={copy.create.hashtagsPlaceholder}
          value={hashtags}
          onChangeText={setHashtags}
          autoCapitalize="none"
        />
        <View style={styles.rows}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setHasTripPlan(true);
              setStep('trip');
            }}
            style={({ pressed }) => [
              styles.listRow,
              tripAttachment && styles.listRowActive,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="map-outline" size={22} color={colors.tealInk} />
            <View style={styles.flex}>
              <Txt variant="label">{vi.mobile.tripPlan.editor.toggle}</Txt>
              <Txt variant="caption" style={tripAttachment ? styles.tripOn : ui.muted} numberOfLines={1}>
                {tripSummary}
              </Txt>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setVisibility(visibility === 'public' ? 'private' : 'public')}
            style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
          >
            <Icon
              name={visibility === 'public' ? 'earth-outline' : 'lock-closed-outline'}
              size={22}
              color={colors.ink}
            />
            <View style={styles.flex}>
              <Txt variant="label">
                {visibility === 'public' ? copy.create.visibilityPublic : copy.create.visibilityPrivate}
              </Txt>
              <Txt variant="caption" style={ui.muted}>
                {copy.create.visibilityHint}
              </Txt>
            </View>
            <Icon name="swap-horizontal" size={18} color={colors.textMuted} />
          </Pressable>
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

/** Đầu trang của từng bước: nút lùi về bước trước (không thoát hẳn màn đăng). */
function StepHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Row style={styles.stepHeader}>
      <IconButton
        name="arrow-back"
        label={vi.mobile.create.back}
        onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
      <Txt variant="label" style={styles.flex}>
        {title}
      </Txt>
      {right}
    </Row>
  );
}

/** Bước 1: xem lại video gần như toàn màn hình rồi bấm Tiếp. */
function VideoStep({
  video,
  isPicking,
  progressPercent,
  detail,
  error,
  onPick,
  onNext,
}: {
  video: PickedVideo | null;
  isPicking: boolean;
  progressPercent: number | null;
  detail: string;
  error: string | null;
  onPick: () => void;
  onNext: () => void;
}) {
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  // Chưa chọn video: màn chào sáng, một nút chính, thay cho khối màu trống.
  if (!video) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.welcomeScreen}>
        <Row style={styles.welcomeHeader}>
          <IconButton name="close" label={vi.mobile.create.back} onPress={close} />
          <Txt variant="label" style={styles.welcomeHeaderTitle}>
            {copy.create.title}
          </Txt>
          <View style={styles.welcomeHeaderSpacer} />
        </Row>
        <View style={styles.welcomeBody}>
          <View style={styles.welcomeIcon}>
            <Icon name="videocam-outline" size={40} color={colors.coralInk} />
          </View>
          <Txt variant="heading" style={styles.welcomeTitle}>
            {copy.create.welcomeTitle}
          </Txt>
          <Txt style={styles.welcomeText}>{copy.create.welcomeBody}</Txt>
          <Button icon="images-outline" style={styles.welcomeButton} disabled={isPicking} onPress={onPick}>
            {isPicking ? copy.create.selecting : copy.create.selectVideo}
          </Button>
          {error && <Notice tone="error">{error}</Notice>}
          <View style={styles.welcomeTips}>
            {[
              { icon: 'phone-portrait-outline' as const, text: copy.create.tipVertical },
              { icon: 'map-outline' as const, text: copy.create.tipTrip },
            ].map((tip) => (
              <Row key={tip.icon} style={styles.welcomeTip}>
                <Icon name={tip.icon} size={18} color={colors.tealInk} />
                <Txt variant="small" style={styles.flex}>
                  {tip.text}
                </Txt>
              </Row>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.videoScreen}>
      <View style={styles.videoStage}>
        <VideoPreview uri={video.uri} />
        <View style={styles.videoTop}>
          <IconButton
            name="close"
            label={vi.mobile.create.back}
            color={colors.background}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          />
          {video && (
            <Pressable accessibilityRole="button" onPress={onPick} style={styles.videoPill}>
              <Txt style={styles.videoPillText}>{copy.create.changeVideo}</Txt>
            </Pressable>
          )}
        </View>
        {video && (
          <View style={styles.videoBottom}>
            <Txt style={styles.videoInfo}>{detail}</Txt>
            {progressPercent !== null && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            )}
          </View>
        )}
      </View>
      {error && <Notice tone="error">{error}</Notice>}
      <Row style={styles.videoActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={[styles.pill, styles.pillLight]}
        >
          <Txt style={styles.pillLightText}>{copy.create.cancel}</Txt>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !video }}
          disabled={!video}
          onPress={onNext}
          style={[styles.pill, styles.pillPrimary, !video && styles.pillDisabled]}
        >
          <Txt style={styles.pillPrimaryText}>{copy.create.next}</Txt>
        </Pressable>
      </Row>
    </SafeAreaView>
  );
}

/** Xem lại video vừa chọn: phát có tiếng; chạm video để dừng/phát, nút loa để tắt/bật tiếng. */
function VideoPreview({ uri }: { uri: string }) {
  const [isMuted, setMuted] = useState(false);
  const [isPaused, setPaused] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.play();
  });
  useEffect(() => {
    player.muted = isMuted;
  }, [player, isMuted]);
  return (
    <>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPaused ? copy.create.play : copy.create.pause}
        style={StyleSheet.absoluteFill}
        onPress={() => {
          if (isPaused) player.play();
          else player.pause();
          setPaused(!isPaused);
        }}
      >
        {isPaused && (
          <View style={styles.previewPaused}>
            <Icon name="play" size={56} color={colors.background} />
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isMuted ? copy.create.unmute : copy.create.mute}
        onPress={() => setMuted(!isMuted)}
        style={styles.previewSound}
      >
        <Icon name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color={colors.background} />
      </Pressable>
    </>
  );
}

/** Ảnh nhỏ ở bước chi tiết: khung đầu của video, không phát. */
function VideoThumb({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.muted = true;
  });
  return (
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
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
  previewPaused: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewSound: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
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
  flex: { flex: 1 },
  captionBlock: { gap: spacing.sm },
  captionRow: { alignItems: 'stretch', gap: spacing.md },
  storyBox: { flex: 1, height: 136, textAlignVertical: 'top', paddingTop: spacing.md },
  thumb: {
    width: 102,
    height: 136,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.seaMist,
  },
  thumbLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.overlayHeavy,
  },
  thumbLabelText: { color: colors.background, fontSize: 12 },
  rows: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  listRowActive: { backgroundColor: colors.seaMist },
  tripOn: { color: colors.tealInk },
  stepHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  videoScreen: { flex: 1, backgroundColor: colors.ink, padding: spacing.sm, gap: spacing.sm },
  videoStage: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.tealInk },
  videoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  videoEmptyText: { color: colors.background, fontSize: 17, fontWeight: '600' },
  videoEmptyHint: { color: colors.background, fontSize: 13, textAlign: 'center' },
  welcomeScreen: { flex: 1, backgroundColor: colors.background },
  welcomeHeader: { alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  welcomeHeaderTitle: { flex: 1, textAlign: 'center' },
  welcomeHeaderSpacer: { width: 44 },
  welcomeBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: mobileLayout.gutter + spacing.sm,
    paddingBottom: spacing.xl * 2,
  },
  welcomeIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmMist,
  },
  welcomeTitle: { textAlign: 'center' },
  welcomeText: { textAlign: 'center', color: colors.textMuted },
  welcomeButton: { alignSelf: 'stretch', marginTop: spacing.sm },
  welcomeTips: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
  welcomeTip: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  videoTop: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.overlayHeavy,
  },
  videoPillText: { color: colors.background, fontSize: 13 },
  videoBottom: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.xs,
  },
  videoInfo: { color: colors.background, fontSize: 12 },
  videoActions: { gap: spacing.sm },
  pill: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.pill },
  pillLight: { backgroundColor: colors.background },
  pillLightText: { color: colors.ink, fontWeight: '600' },
  pillPrimary: { backgroundColor: colors.coral },
  pillPrimaryText: { color: colors.background, fontWeight: '600' },
  pillDisabled: { opacity: 0.5 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  published: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  publishedTitle: { textAlign: 'center' },
  publishedBody: { textAlign: 'center', color: colors.textMuted },
  draft: { flex: 1 },
  publish: { flex: 1 },
});
