import { getReelPlaybackSources, getReelPlayerIndexes, getReelResolutionCap } from '@tripflix/app-core';
import { useVideoPlayer, type VideoPlayer } from 'expo-video';
import { Platform } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReelItem } from './reel-types';

const RENDITION_TIMEOUT_MS = 8_000;

/** Native SharedObjects have mutable setters, outside React's immutable render data. */
function applyPlayerLimits(
  player: VideoPlayer,
  { forwardBufferDuration, maxResolution }: {
    forwardBufferDuration: number;
    maxResolution: VideoPlayer['maxResolution'];
  },
) {
  player.maxResolution = maxResolution;
  player.bufferOptions = {
    preferredForwardBufferDuration: forwardBufferDuration,
    minBufferForPlayback: 1,
    prioritizeTimeOverSizeThreshold: true,
  };
}

function applyPlaybackIntent(
  player: VideoPlayer,
  { shouldPlay, isMuted }: { shouldPlay: boolean; isMuted: boolean },
) {
  player.muted = isMuted || !shouldPlay;
  if (shouldPlay) player.play();
  else player.pause();
}

// Adapted from feed-demo/src/usePlayerPool.ts: mute before pausing native playback.
function silencePlayer(player: VideoPlayer) {
  player.muted = true;
  player.pause();
}

function usePlayerSlot({
  item,
  isCurrent,
  forwardBufferDuration,
  shouldPlay,
  isMuted,
  isDataLimited,
  retry,
}: {
  item?: ReelItem;
  isCurrent: boolean;
  forwardBufferDuration: number;
  shouldPlay: boolean;
  isMuted: boolean;
  isDataLimited: boolean;
  retry: number;
}) {
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.staysActiveInBackground = false;
  });
  const sources = item ? getReelPlaybackSources(item.playback, isDataLimited ? 540 : Infinity) : [];
  const sourceKey = item ? JSON.stringify([item.id, retry, sources]) : null;
  // Keep the fallback only for this assignment, even if this slot later returns to the same Reel.
  const assignment = useMemo(() => ({ sourceKey }), [sourceKey]);
  const [fallback, setFallback] = useState<{ assignment: typeof assignment; index: number } | null>(null);
  const sourceIndex = fallback?.assignment === assignment ? fallback.index : 0;
  const uri = sources[sourceIndex] ?? null;
  const request = useMemo(() => ({ assignment, uri }), [assignment, uri]);
  const queue = useRef(Promise.resolve());
  const appliedLimitsKey = useRef<string | null>(null);
  const readyRequest = useRef<typeof request | null>(null);
  const [loadedRequest, setLoadedRequest] = useState<typeof request | null>(null);
  const [failedRequest, setFailedRequest] = useState<typeof request | null>(null);
  const canFallback = sources[sourceIndex + 1] !== undefined;
  const onSourceFailure = useCallback(() => {
    if (canFallback) {
      setFallback((current) =>
        current?.assignment === assignment && current.index > sourceIndex
          ? current
          : { assignment, index: sourceIndex + 1 },
      );
    } else {
      setFailedRequest(request);
    }
  }, [assignment, canFallback, sourceIndex, request]);

  useEffect(() => {
    const controller = new AbortController();
    silencePlayer(player);
    // Serialize native replacements so a slow, obsolete load cannot replace a newer source.
    queue.current = queue.current
      .then(async () => {
        if (controller.signal.aborted) return;
        await player.replaceAsync(
          request.uri
            ? // expo-video cannot cache HLS on iOS, so caching is only requested on Android.
              { uri: request.uri, contentType: 'hls', useCaching: Platform.OS === 'android' }
            : null,
        );
        if (!controller.signal.aborted) setLoadedRequest(request);
      })
      .catch(() => {
        if (!controller.signal.aborted) onSourceFailure();
      });
    return () => {
      controller.abort();
      silencePlayer(player);
    };
  }, [player, request, onSourceFailure]);

  const hasError = request.uri !== null && failedRequest === request;
  const isLoaded = request.uri !== null && loadedRequest === request && !hasError;
  const aspect = item?.playback.aspect ?? '9:16';
  const synchronize = useCallback(
    (status: VideoPlayer['status'] = player.status) => {
      // These setters reach the native player, so they only run when a limit really changes.
      const limitsKey = `${sourceKey}|${forwardBufferDuration}|${isDataLimited}`;
      if (appliedLimitsKey.current !== limitsKey) {
        appliedLimitsKey.current = limitsKey;
        applyPlayerLimits(player, {
          forwardBufferDuration,
          maxResolution: isDataLimited ? getReelResolutionCap(aspect) : null,
        });
      }
      applyPlaybackIntent(player, {
        shouldPlay: shouldPlay && isLoaded && status === 'readyToPlay',
        isMuted,
      });
    },
    [player, sourceKey, forwardBufferDuration, shouldPlay, isMuted, isLoaded, isDataLimited, aspect],
  );
  useEffect(() => {
    if (Platform.OS === 'web') return;
    synchronize();
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') synchronize(status);
    });
    return () => {
      subscription.remove();
      silencePlayer(player);
    };
  }, [player, synchronize]);

  useEffect(() => {
    if (!isLoaded) return;
    if (player.status === 'error') {
      onSourceFailure();
      return;
    }
    if (player.status === 'readyToPlay') readyRequest.current = request;
    // Only give up on a slow rendition while trying to start the visible Reel.
    // Offscreen players have time to warm up, and playback keeps its chosen level once ready.
    const timeout =
      isCurrent && canFallback && readyRequest.current !== request
        ? setTimeout(onSourceFailure, RENDITION_TIMEOUT_MS)
        : undefined;
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') readyRequest.current = request;
      if (status === 'readyToPlay' || status === 'error') clearTimeout(timeout);
      if (status === 'error') onSourceFailure();
    });
    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [player, request, isLoaded, isCurrent, canFallback, onSourceFailure]);

  return {
    player,
    isLoaded,
    hasError,
    shouldPlay,
    isMuted,
    onAttach: Platform.OS === 'web' ? undefined : synchronize,
  };
}

export function usePlayerPool({
  items,
  activeIndex,
  focusedIndex,
  isEnabled,
  isPaused,
  isMuted,
  isDataLimited,
  retry,
}: {
  items: readonly ReelItem[];
  activeIndex: number;
  focusedIndex: number;
  isEnabled: boolean;
  isPaused: boolean;
  isMuted: boolean;
  isDataLimited: boolean;
  retry: { id: string; attempt: number } | null;
}) {
  const indexes = getReelPlayerIndexes(items.length, activeIndex);
  const itemAt = (slot: number) => {
    const index = indexes[slot];
    return isEnabled && index != null ? items[index] : undefined;
  };
  const optionsAt = (slot: number) => {
    const item = itemAt(slot);
    const index = indexes[slot];
    const isCurrent = index === focusedIndex;
    // Keep the two farther-ahead players to roughly one HLS segment on native.
    const forwardBufferDuration = isCurrent ? 30 : index != null && index > focusedIndex + 1 ? 2 : 4;
    return {
      item,
      isCurrent,
      forwardBufferDuration,
      shouldPlay: isEnabled && !isPaused && isCurrent,
      isMuted,
      isDataLimited,
      retry: retry?.id === item?.id ? (retry?.attempt ?? 0) : 0,
    };
  };
  const first = usePlayerSlot(optionsAt(0));
  const second = usePlayerSlot(optionsAt(1));
  const third = usePlayerSlot(optionsAt(2));
  const fourth = usePlayerSlot(optionsAt(3));
  const fifth = usePlayerSlot(optionsAt(4));
  return [first, second, third, fourth, fifth].map((slot, index) => ({ ...slot, index: indexes[index] }));
}
