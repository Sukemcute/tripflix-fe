import { getReelResolutionCap, getReelPlayerIndexes } from '@tripflix/app-core';
import { useVideoPlayer, type VideoPlayer } from 'expo-video';
import { Platform } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReelItem } from './reel-types';

/** Native SharedObjects have mutable setters, outside React's immutable render data. */
function applyPlayerLimits(
  player: VideoPlayer,
  { isCurrent, maxResolution }: { isCurrent: boolean; maxResolution: VideoPlayer['maxResolution'] },
) {
  player.maxResolution = maxResolution;
  player.bufferOptions = {
    preferredForwardBufferDuration: isCurrent ? 30 : 4,
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
  shouldPlay,
  isMuted,
  isDataLimited,
  retry,
}: {
  item?: ReelItem;
  isCurrent: boolean;
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
  const sourceKey = item ? `${item.id}\n${item.playback.hlsUrl}\n${retry}` : null;
  const uri = item?.playback.hlsUrl ?? null;
  const request = useMemo(() => ({ sourceKey, uri }), [sourceKey, uri]);
  const queue = useRef(Promise.resolve());
  const appliedLimitsKey = useRef<string | null>(null);
  const [loadedRequest, setLoadedRequest] = useState<typeof request | null>(null);
  const [failedRequest, setFailedRequest] = useState<typeof request | null>(null);

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
        if (!controller.signal.aborted) setFailedRequest(request);
      });
    return () => {
      controller.abort();
      silencePlayer(player);
    };
  }, [player, request]);

  const isLoaded = sourceKey !== null && loadedRequest === request;
  const aspect = item?.playback.aspect ?? '9:16';
  const synchronize = useCallback(
    (status: VideoPlayer['status'] = player.status) => {
      // These setters reach the native player, so they only run when a limit really changes.
      const limitsKey = `${sourceKey}|${isCurrent}|${isDataLimited}`;
      if (appliedLimitsKey.current !== limitsKey) {
        appliedLimitsKey.current = limitsKey;
        applyPlayerLimits(player, {
          isCurrent,
          maxResolution: isDataLimited ? getReelResolutionCap(aspect) : null,
        });
      }
      applyPlaybackIntent(player, {
        shouldPlay: shouldPlay && isLoaded && status === 'readyToPlay',
        isMuted,
      });
    },
    [player, sourceKey, isCurrent, shouldPlay, isMuted, isLoaded, isDataLimited, aspect],
  );
  useEffect(() => {
    synchronize();
    // A preloaded web player can become ready only after its VideoView mounts.
    const subscription = player.addListener('statusChange', ({ status }) => {
      // The web player emits this event before updating its status getter.
      if (status === 'readyToPlay') synchronize(status);
    });
    return () => {
      subscription.remove();
      silencePlayer(player);
    };
  }, [player, synchronize]);

  return {
    player,
    isLoaded,
    hasError: sourceKey !== null && failedRequest === request,
    onAttach: synchronize,
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
    const isCurrent = indexes[slot] === focusedIndex;
    return {
      item,
      isCurrent,
      shouldPlay: isEnabled && !isPaused && isCurrent,
      isMuted,
      isDataLimited,
      retry: retry?.id === item?.id ? (retry?.attempt ?? 0) : 0,
    };
  };
  const first = usePlayerSlot(optionsAt(0));
  const second = usePlayerSlot(optionsAt(1));
  const third = usePlayerSlot(optionsAt(2));
  return [first, second, third].map((slot, index) => ({ ...slot, index: indexes[index] }));
}
