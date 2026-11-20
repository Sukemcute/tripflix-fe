import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buildTripAttachment,
  buildTripDraftFromAttachment,
  createTripPlanDraft,
  getPostTitleFromCaption,
  POST_MEDIA_LIMITS,
  type PostDraftContent,
  type PostDraftRecovery,
  type PostDraftVideo,
  type TripPlanDraft,
} from '@tripflix/app-core';
import {
  itineraryApi,
  SAVED_ITINERARIES_QUERY_KEY,
  socialApi,
  uploadVideo,
  useApiSession,
} from '@tripflix/api-client';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  Alert,
  AppState,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { startPostUpload } from './post-upload-store';
import {
  clearPublishedPostDraft,
  readPostDraft,
  restorePostDraftVideo,
  writePostDraft,
} from './post-draft-storage';
import { PostDraftExitDialog } from './post-draft-exit-dialog';
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
  const { postId, itineraryId } = useLocalSearchParams<{ postId?: string; itineraryId?: string }>();
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
  return (
    <RecoverableDraftEditor
      key={`${user.id}:${postId ?? 'new'}`}
      post={query.data?.post}
      itineraryId={postId ? undefined : itineraryId}
      userId={user.id}
    />
  );
}

function RecoverableDraftEditor(props: { post?: SocialPostDto; itineraryId?: string; userId: string }) {
  const editorKey = props.post?.id ?? 'new';
  const [baseline] = useState<PostDraftContent>(() => ({
    title: props.post?.title ?? '',
    body: props.post?.body ?? '',
    hashtags: props.post?.hashtags.join(', ') ?? '',
    visibility: props.post?.visibility === 'private' ? 'private' : 'public',
    hasTripPlan: !!props.post?.tripAttachment,
    tripDraft: props.post?.tripAttachment
      ? buildTripDraftFromAttachment(props.post.tripAttachment, vi.mobile.tripPlan.modes)
      : createTripPlanDraft(),
    video: null,
  }));
  const [loaded, setLoaded] = useState<{
    draft: PostDraftRecovery | null;
    video: PickedVideo | null;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    let active = true;
    void readPostDraft(props.userId, editorKey).then(
      (draft) => {
        if (active) {
          // Restored p1/p2 keys must not collide with newly created points after an app restart.
          if (draft)
            draft.content.tripDraft.days = draft.content.tripDraft.days.map((day, dayIndex) => ({
              ...day,
              points: day.points.map((point, pointIndex) => ({
                ...point,
                key: `recovered-${dayIndex}-${pointIndex}`,
              })),
            }));
          setLoaded({ draft, video: draft ? restorePostDraftVideo(draft) : null, error: false });
        }
      },
      () => {
        if (active) setLoaded({ draft: null, video: null, error: true });
      },
    );
    return () => {
      active = false;
    };
  }, [props.userId, editorKey]);
  if (!loaded)
    return (
      <Screen title={copy.create.title}>
        <Txt>{copy.create.recovery.loading}</Txt>
        <LoadingDots />
      </Screen>
    );
  return (
    <DraftEditor
      {...props}
      baseline={baseline}
      recovery={loaded.draft}
      recoveredVideo={loaded.video}
      recoveryError={loaded.error}
    />
  );
}

function DraftEditor({
  post,
  itineraryId,
  userId,
  baseline,
  recovery,
  recoveredVideo,
  recoveryError,
}: {
  post?: SocialPostDto;
  itineraryId?: string;
  userId: string;
  baseline: PostDraftContent;
  recovery: PostDraftRecovery | null;
  recoveredVideo: PickedVideo | null;
  recoveryError: boolean;
}) {
  const client = useQueryClient();
  const initial = recovery?.content ?? baseline;
  const editorKey = post?.id ?? 'new';
  const [id, setId] = useState(recovery?.postId ?? post?.id);
  // Tiêu đề riêng như web; để trống thì lấy dòng đầu caption (core bắt buộc có tiêu đề).
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const postTitle = title.trim() || getPostTitleFromCaption(body);
  const [hashtags, setHashtags] = useState(initial.hashtags);
  const [visibility, setVisibility] = useState<'public' | 'private'>(initial.visibility);
  const [video, setVideo] = useState<PickedVideo | null>(recoveredVideo);
  const [sourceVideo, setSourceVideo] = useState<PostDraftVideo | null>(initial.video);
  const [missingMedia, setMissingMedia] = useState(!!initial.video && !recoveredVideo);
  // Video đã tải lên ở lần bấm trước (ví dụ tải xong nhưng tạo bài lỗi): không tải lại.
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  // Nén ngay sau khi chọn, chạy trong lúc người dùng viết bài; bấm đăng thì chờ nén xong rồi tải lên.
  const compression = useRef<VideoCompression | null>(null);
  const [compressPercent, setCompressPercent] = useState<number | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [isPicking, setPicking] = useState(false);
  // Đăng theo từng bước (TF105): xem lại video → chi tiết bài → (tuỳ chọn) soạn lộ trình.
  const [step, setStep] = useState<'video' | 'details' | 'trip'>(post || recovery ? 'details' : 'video');
  // Đăng kèm lộ trình là tuỳ chọn; chưa mở bước lộ trình thì đăng như bài thường.
  // Sửa bài cũ thì nạp lại lộ trình đã lưu, để lưu lại không mất giờ, khách sạn, chặng bay, loại gợi ý.
  const [hasTripPlan, setHasTripPlan] = useState(initial.hasTripPlan);
  const [tripDraft, setTripDraft] = useState<TripPlanDraft>(initial.tripDraft);
  const content = useMemo<PostDraftContent>(
    () => ({
      title,
      body,
      hashtags,
      visibility,
      hasTripPlan,
      tripDraft,
      video: sourceVideo,
    }),
    [title, body, hashtags, visibility, hasTripPlan, tripDraft, sourceVideo],
  );
  const fingerprint = JSON.stringify(content);
  const [savedFingerprint, setSavedFingerprint] = useState(JSON.stringify(baseline));
  const dirty = fingerprint !== savedFingerprint;
  const [deviceFingerprint, setDeviceFingerprint] = useState(recovery ? fingerprint : '');
  const [deviceError, setDeviceError] = useState(false);
  const [isLeaving, setLeaving] = useState(false);
  const [isHandedOff, setHandedOff] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);
  const exitNavigation = useRef<(() => void) | null>(null);
  const latestDraft = useRef<PostDraftRecovery>({
    version: 1,
    userId,
    editorKey,
    postId: id ?? null,
    savedAt: 0,
    content,
  });
  useEffect(() => {
    latestDraft.current = { version: 1, userId, editorKey, postId: id ?? null, savedAt: Date.now(), content };
  }, [content, id, userId, editorKey]);
  const submittedDraft = useRef<PostDraftRecovery | null>(null);
  useEffect(() => {
    if (!dirty || isLeaving || isHandedOff) return;
    const writing = new AbortController();
    void writePostDraft(userId, editorKey, latestDraft.current).then(
      () => {
        if (!writing.signal.aborted) {
          setDeviceFingerprint(fingerprint);
          setDeviceError(false);
        }
      },
      () => {
        if (!writing.signal.aborted) setDeviceError(true);
      },
    );
    return () => {
      writing.abort();
    };
  }, [fingerprint, id, userId, editorKey, dirty, isLeaving, isHandedOff]);
  useEffect(() => {
    if (!dirty && deviceFingerprint && deviceFingerprint !== fingerprint && !isLeaving && !isHandedOff) {
      void writePostDraft(userId, editorKey, null).then(
        () => setDeviceFingerprint(''),
        () => setDeviceError(true),
      );
    }
  }, [dirty, deviceFingerprint, fingerprint, isLeaving, isHandedOff, userId, editorKey]);
  useEffect(() => {
    if (!dirty || isLeaving || isHandedOff) return;
    const persist = () => {
      void writePostDraft(userId, editorKey, latestDraft.current).catch(() => setDeviceError(true));
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') persist();
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      persist();
      event.preventDefault();
      event.returnValue = '';
    };
    if (Platform.OS === 'web') {
      globalThis.addEventListener('pagehide', persist);
      globalThis.addEventListener('beforeunload', beforeUnload);
    }
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') {
        globalThis.removeEventListener('pagehide', persist);
        globalThis.removeEventListener('beforeunload', beforeUnload);
      }
    };
  }, [dirty, isLeaving, isHandedOff, userId, editorKey]);
  useEffect(() => {
    if (isLeaving) exitNavigation.current?.();
  }, [isLeaving]);
  const [isDraggingPoint, setDraggingPoint] = useState(false);
  const uploadAbort = useRef<AbortController | null>(null);
  // Đăng xong thì thay cả form bằng màn báo đã đăng, để không ai bấm đăng lại hay tưởng chưa đăng.
  const [published, setPublished] = useState<{ id: string; hasVideo: boolean; held: boolean } | null>(null);
  // Video đã tải xong thì bài sẽ được tạo dù người dùng rời màn, nên lúc đó không cho huỷ nữa.
  const [isUploadDone, setUploadDone] = useState(false);
  useEffect(
    () => () => {
      uploadAbort.current?.abort();
      compression.current?.dispose();
    },
    [],
  );

  const sharedItinerary = useQuery({
    queryKey: [...SAVED_ITINERARIES_QUERY_KEY, userId, 'share-to-reels', itineraryId],
    enabled: !!itineraryId,
    queryFn: ({ signal }) => itineraryApi.get(itineraryId!, signal),
  });
  const handledItinerary = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!itineraryId) {
      handledItinerary.current = undefined;
      return;
    }
    if (handledItinerary.current === itineraryId) return;
    const itinerary = sharedItinerary.data;
    if (!itinerary && !sharedItinerary.isError) return;

    handledItinerary.current = itineraryId;
    router.setParams({ itineraryId: undefined });
    const shareCopy = vi.mobile.savedItinerary;
    if (!itinerary) {
      Alert.alert(shareCopy.shareFailed);
      return;
    }
    const apply = () => {
      setTripDraft(
        buildTripDraftFromAttachment(
          {
            destinationName: itinerary.destinationName,
            destinationPlaceId: itinerary.destinationPlaceId,
            daysCount: itinerary.daysCount,
            items: itinerary.items.map((item) => ({
              ...item,
              notes:
                !item.time && item.slot
                  ? [shareCopy.slots[item.slot], item.notes].filter(Boolean).join(' · ')
                  : item.notes,
            })),
          },
          vi.mobile.tripPlan.modes,
        ),
      );
      setHasTripPlan(true);
      setTitle((current) => (current.trim() ? current : itinerary.title));
    };
    if (hasTripPlan) {
      Alert.alert(shareCopy.replaceDraftTitle, shareCopy.replaceDraftBody, [
        { text: shareCopy.cancel, style: 'cancel' },
        { text: shareCopy.replaceDraftAction, onPress: apply },
      ]);
    } else {
      apply();
    }
  }, [hasTripPlan, itineraryId, sharedItinerary.data, sharedItinerary.isError]);

  function selectVideo(next: PickedVideo | null) {
    compression.current?.dispose();
    compression.current = null;
    setCompressPercent(null);
    setVideo(next);
    setSourceVideo(
      next
        ? {
            uri: next.uri,
            durationMs: next.durationMs,
            width: next.width,
            height: next.height,
            mimeType: next.mimeType,
            sizeBytes: next.sizeBytes,
          }
        : null,
    );
    setMissingMedia(false);
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
      if (missingMedia) throw new Error(copy.create.recovery.missingMedia);
      submittedDraft.current = latestDraft.current;
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
      const publication =
        action === 'publish' && savedPost.status === 'draft'
          ? await socialApi.publishPost(savedPost.id)
          : savedPost;
      return { ...savedPost, status: publication.status };
    },
    onSuccess: async (savedPost, action) => {
      setId(savedPost.id);
      if (submittedDraft.current) {
        setSavedFingerprint(JSON.stringify(submittedDraft.current.content));
        await clearPublishedPostDraft(submittedDraft.current).catch(() => setDeviceError(true));
      }
      if (action === 'publish') {
        Keyboard.dismiss();
        setPublished({
          id: savedPost.id,
          hasVideo: savedPost.postType === 'video',
          held: savedPost.status === 'held',
        });
      }
      await client.invalidateQueries({ queryKey: ['social'] });
    },
  });
  // Đăng (TF105): giao việc nén, tải video và đăng bài cho tiến trình nền rồi về màn chính ngay.
  function publishInBackground() {
    if (!body.trim() || mutation.isPending || missingMedia) return;
    const handedOffDraft = latestDraft.current!;
    void writePostDraft(userId, editorKey, handedOffDraft).catch(() => setDeviceError(true));
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
      onPublished: () => clearPublishedPostDraft(handedOffDraft),
    });
    compression.current = null;
    Keyboard.dismiss();
    setHandedOff(true);
    exitNavigation.current = () => router.replace('/(tabs)');
    setLeaving(true);
  }
  const isBusy = mutation.isPending || isPicking;
  const navigation = useNavigation();
  // Đang đăng hay lưu mà bấm quay lại, vuốt mép hay nút back Android: hỏi trước, không thoát ngay.
  usePreventRemove(!isLeaving && !published && !isHandedOff && (mutation.isPending || dirty), ({ data }) => {
    exitNavigation.current = () => navigation.dispatch(data.action);
    if (!mutation.isPending) {
      Keyboard.dismiss();
      setExitOpen(true);
      return;
    }
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
          setLeaving(true);
        },
      },
    ]);
  });
  async function leaveEditor(keep: boolean) {
    setExitBusy(true);
    try {
      await writePostDraft(userId, editorKey, keep ? latestDraft.current : null);
      setDeviceError(false);
      setLeaving(true);
    } catch {
      setDeviceError(true);
    } finally {
      setExitBusy(false);
    }
  }
  const exitDialog = (
    <PostDraftExitDialog
      visible={exitOpen}
      busy={exitBusy}
      error={deviceError}
      onKeep={() => {
        void leaveEditor(true);
      }}
      onDiscard={() => {
        void leaveEditor(false);
      }}
      onContinue={() => setExitOpen(false)}
    />
  );
  const recoveryNotice =
    recoveryError || recovery || missingMedia || dirty || deviceError ? (
      <View style={{ gap: spacing.sm }}>
        {recoveryError && <Notice tone="warning">{copy.create.recovery.loadFailed}</Notice>}
        {recovery && <Notice>{copy.create.recovery.restored}</Notice>}
        {missingMedia && (
          <>
            <Notice tone="warning">{copy.create.recovery.missingMedia}</Notice>
            <Button
              tone="secondary"
              style={{ borderRadius: 8 }}
              onPress={() => {
                void pickVideo();
              }}
            >
              {copy.create.recovery.chooseMedia}
            </Button>
          </>
        )}
        {dirty && (
          <Txt
            variant="small"
            accessibilityLiveRegion="polite"
            style={{ color: deviceError ? colors.coralInk : colors.tealInk }}
          >
            {deviceError
              ? copy.create.recovery.failed
              : deviceFingerprint === fingerprint
                ? copy.create.recovery.saved
                : copy.create.recovery.saving}
          </Txt>
        )}
        {deviceError && (
          <Button
            tone="secondary"
            style={{ borderRadius: 8 }}
            onPress={() => {
              void writePostDraft(userId, editorKey, latestDraft.current).then(
                () => {
                  setDeviceFingerprint(fingerprint);
                  setDeviceError(false);
                },
                () => setDeviceError(true),
              );
            }}
          >
            {copy.create.recovery.retry}
          </Button>
        )}
      </View>
    ) : null;
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
  if (published)
    return <PublishedView postId={published.id} hasVideo={published.hasVideo} held={published.held} />;
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
      <DraftEditorFrame exitOpen={exitOpen} dialog={exitDialog}>
        <VideoStep
          canContinueDraft={!!body.trim() || !!title.trim() || hasTripPlan}
          notice={recoveryNotice}
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
      </DraftEditorFrame>
    );
  }

  if (step === 'trip') {
    return (
      <DraftEditorFrame exitOpen={exitOpen} dialog={exitDialog}>
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
            {recoveryNotice}
            <TripPlanEditor draft={tripDraft} onChange={setTripDraft} onDragChange={setDraggingPoint} />
          </ScrollView>
        </Screen>
      </DraftEditorFrame>
    );
  }

  return (
    <DraftEditorFrame exitOpen={exitOpen} dialog={exitDialog}>
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
                disabled={mutation.isPending || !body.trim() || missingMedia}
                onPress={() => mutation.mutate('save')}
              >
                {isSaving ? vi.api.saving : copy.create.recovery.serverSave}
              </Button>
              <Button
                compact
                icon="arrow-up-circle-outline"
                style={styles.publish}
                disabled={mutation.isPending || !body.trim() || missingMedia}
                onPress={publishInBackground}
              >
                {isPublishing ? copy.create.publishing : vi.api.publish}
              </Button>
            </View>
          </View>
        }
      >
        <View style={styles.form}>
          {recoveryNotice}
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
            <Button
              tone="text"
              onPress={() => router.push({ pathname: '/trip/[slug]', params: { slug: id } })}
            >
              {vi.api.detail}
            </Button>
          )}
        </View>
      </Screen>
    </DraftEditorFrame>
  );
}

function DraftEditorFrame({
  children,
  exitOpen,
  dialog,
}: PropsWithChildren<{ exitOpen: boolean; dialog: ReactNode }>) {
  return (
    <>
      <View
        style={ui.flex}
        aria-hidden={exitOpen}
        accessibilityElementsHidden={exitOpen}
        importantForAccessibility={exitOpen ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {dialog}
    </>
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
  canContinueDraft,
  notice,
  video,
  isPicking,
  progressPercent,
  detail,
  error,
  onPick,
  onNext,
}: {
  canContinueDraft?: boolean;
  notice?: React.ReactNode;
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
        <ScrollView contentContainerStyle={styles.welcomeBody} keyboardShouldPersistTaps="handled">
          {notice}
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
          {canContinueDraft && (
            <Button tone="secondary" style={{ alignSelf: 'stretch', borderRadius: 8 }} onPress={onNext}>
              {copy.create.recovery.continue}
            </Button>
          )}
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
        </ScrollView>
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
      {notice}
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

function PublishedView({ postId, hasVideo, held }: { postId: string; hasVideo: boolean; held: boolean }) {
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
        <Mascot pose={held ? 'curious' : 'celebrate'} size={132} />
        <Txt variant="title" style={styles.publishedTitle} accessibilityRole="header">
          {held ? vi.moderation.heldTitle : copy.create.publishedTitle}
        </Txt>
        <Txt style={styles.publishedBody}>
          {held
            ? vi.moderation.heldPost
            : hasVideo
              ? copy.create.publishedVideoBody
              : copy.create.publishedBody}
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
    flexGrow: 1,
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
