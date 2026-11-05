import { colors as c, spacing as s } from '@tripflix/tokens';
import { POST_MEDIA_LIMITS, validatePostMedia } from '@tripflix/app-core';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import {
  assets,
  Badge,
  Button,
  Card,
  Chip,
  copy,
  Field,
  Icon,
  Mascot,
  Notice,
  Screen,
  Sheet,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { useReview } from '@/features/review/review-provider';

export function CreateScreen() {
  const review = useReview();
  const [hasAttempted, setAttempted] = useState(false);
  const [hasMediaSheet, setMediaSheet] = useState(false);
  const [isSubmitted, setSubmitted] = useState(false);
  const [isPicking, setPicking] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [hasPermissionError, setPermissionError] = useState(false);
  const pickerRequest = useRef(0);
  const isPickerOpen = useRef(false);
  useEffect(
    () => () => {
      pickerRequest.current += 1;
    },
    [],
  );
  const canSubmit = review.media.length > 0 && review.story.trim().length >= 10;

  function closeMediaSheet() {
    pickerRequest.current += 1;
    isPickerOpen.current = false;
    setPicking(false);
    setMediaSheet(false);
  }

  async function pickMedia(kind: 'image' | 'video'): Promise<void> {
    if (isPickerOpen.current) return;
    isPickerOpen.current = true;
    const request = ++pickerRequest.current;
    setPicking(true);
    setPickerError(null);
    setPermissionError(false);
    try {
      // The system photo picker grants access to selected files; no broad library permission is needed.
      // Launch directly from the press handler so web browsers retain user activation.
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kind === 'image' ? ['images'] : ['videos'],
        allowsMultipleSelection: kind === 'image',
        selectionLimit: kind === 'image' ? POST_MEDIA_LIMITS.images : 1,
        allowsEditing: false,
        quality: 1,
        exif: false,
        videoMaxDuration: POST_MEDIA_LIMITS.videoDurationMs / 1000,
      });
      if (request !== pickerRequest.current || selection.canceled) return;
      const selectedAssets = selection.assets.map((asset) => ({
        ...asset,
        // expo-image-picker 58.0.10 web reports seconds; its native implementations report milliseconds.
        durationMs: asset.duration == null ? undefined : asset.duration * (Platform.OS === 'web' ? 1000 : 1),
      }));
      const validationError = validatePostMedia(selectedAssets, kind);
      if (validationError) {
        setPickerError(copy.create[validationError]);
        return;
      }
      review.setMedia(
        selectedAssets.map((asset) => ({
          source: { uri: asset.uri },
          type: kind,
          fileName: asset.fileName,
          durationMs: asset.durationMs,
        })),
      );
      setMediaSheet(false);
    } catch (error: unknown) {
      if (request !== pickerRequest.current) return;
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
      const isPermissionError = /permission/i.test(code);
      setPermissionError(isPermissionError);
      setPickerError(
        isPermissionError
          ? copy.create.permissionDenied
          : code === 'ERR_UNAVAILABLE'
            ? copy.create.imagePickerUnavailable
            : copy.create.pickerError,
      );
    } finally {
      if (request === pickerRequest.current) {
        isPickerOpen.current = false;
        setPicking(false);
      }
    }
  }
  function submit() {
    setAttempted(true);
    if (!review.isSignedIn) {
      review.requireAccount('create', '/create');
      return;
    }
    if (!canSubmit) return;
    review.setPostPending(true);
    setSubmitted(true);
  }
  if (isSubmitted)
    return (
      <Screen title={copy.create.title}>
        <View style={{ alignItems: 'center', gap: s.xl, paddingTop: s.xl }}>
          <Mascot pose="celebrate" size={180} />
          <Badge icon="time-outline">{copy.trips.pending}</Badge>
          <Txt variant="title" style={ui.center}>
            {copy.create.pendingTitle}
          </Txt>
          <Txt variant="small" style={[ui.muted, ui.center]}>
            {copy.create.pendingBody}
          </Txt>
          <Button
            icon="arrow-forward"
            onPress={() => {
              review.setMedia([]);
              review.setStory('');
              router.replace('/(tabs)/me');
            }}
          >
            {copy.create.backProfile}
          </Button>
        </View>
      </Screen>
    );
  return (
    <Screen
      title={copy.create.title}
      footer={
        <Button icon="paper-plane-outline" onPress={submit} disabled={isPicking}>
          {copy.create.submit}
        </Button>
      }
    >
      <View style={{ gap: s.sm }}>
        <Txt variant="title">{copy.create.headline}</Txt>
        <Txt variant="small" style={ui.muted}>
          {copy.create.body}
        </Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.create.upload}
        onPress={() => {
          setPickerError(null);
          setPermissionError(false);
          setMediaSheet(true);
        }}
        style={[
          ui.card,
          {
            backgroundColor: c.warmMist,
            minHeight: 160,
            justifyContent: 'center',
            alignItems: 'center',
            borderStyle: 'dashed',
          },
        ]}
      >
        <Icon name="cloud-upload-outline" color={c.tealInk} size={32} />
        <Txt variant="label">{copy.create.upload}</Txt>
        <Txt variant="caption" style={[ui.muted, ui.center]}>
          {copy.create.uploadHint}
        </Txt>
      </Pressable>
      {review.media.map((media, index) => (
        <Card key={index} style={{ padding: s.sm }}>
          {media.type === 'video' ? (
            <View
              style={{
                minHeight: 160,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.seaMist,
                borderRadius: 12,
                padding: s.lg,
                gap: s.sm,
              }}
            >
              <Icon name="film-outline" size={36} color={c.tealInk} />
              <Txt variant="label">{copy.create.videoSelected}</Txt>
              <Txt variant="small">
                {Math.floor((media.durationMs ?? 0) / 60_000)}:
                {String(Math.floor((media.durationMs ?? 0) / 1000) % 60).padStart(2, '0')}
              </Txt>
            </View>
          ) : (
            <Image
              source={media.source}
              style={{ height: 160, width: '100%', borderRadius: 12 }}
              contentFit="cover"
            />
          )}
          {media.fileName && (
            <Txt variant="caption" numberOfLines={2}>
              {media.fileName}
            </Txt>
          )}
          <Button
            tone="text"
            onPress={() =>
              review.setMedia((previous) => previous.filter((_, mediaIndex) => mediaIndex !== index))
            }
          >
            {copy.create.remove}
          </Button>
        </Card>
      ))}
      <Field
        label={copy.create.story}
        placeholder={copy.create.placeholder}
        multiline
        textAlignVertical="top"
        style={{ minHeight: 140 }}
        value={review.story}
        onChangeText={review.setStory}
      />
      <Txt variant="label">{copy.create.attach}</Txt>
      <View style={{ gap: s.sm }}>
        <Chip selected={review.isCompletedTrip} onPress={() => review.setCompletedTrip(true)}>
          {copy.create.completed}
        </Chip>
        <Chip selected={!review.isCompletedTrip} onPress={() => review.setCompletedTrip(false)}>
          {copy.create.selfAdded}
        </Chip>
      </View>
      <Notice>{review.isCompletedTrip ? copy.create.verification : copy.create.unverified}</Notice>
      {hasAttempted && !canSubmit && <Notice tone="error">{copy.create.required}</Notice>}
      <Txt variant="caption" style={ui.muted}>
        {copy.create.draft}
      </Txt>
      <Sheet title={copy.create.upload} visible={hasMediaSheet} onClose={closeMediaSheet}>
        <Txt variant="small" style={ui.muted}>
          {copy.create.pickerHint}
        </Txt>
        <Button
          icon="images-outline"
          disabled={isPicking}
          onPress={() => {
            void pickMedia('image');
          }}
        >
          {copy.create.selectImages}
        </Button>
        <Button
          icon="film-outline"
          tone="secondary"
          disabled={isPicking}
          onPress={() => {
            void pickMedia('video');
          }}
        >
          {copy.create.selectVideo}
        </Button>
        {isPicking && (
          <Txt accessibilityLiveRegion="polite" variant="small">
            {copy.create.selecting}
          </Txt>
        )}
        {pickerError && <Notice tone="error">{pickerError}</Notice>}
        {hasPermissionError && Platform.OS !== 'web' && (
          <Button
            tone="text"
            onPress={() => {
              void Linking.openSettings().catch(() => setPickerError(copy.create.pickerError));
            }}
          >
            {copy.create.openSettings}
          </Button>
        )}
        <Button
          tone="secondary"
          disabled={isPicking}
          onPress={() => {
            review.setMedia([{ source: assets.hoiAn, type: 'image' }]);
            setMediaSheet(false);
          }}
        >
          {copy.create.useSample}
        </Button>
      </Sheet>
    </Screen>
  );
}
