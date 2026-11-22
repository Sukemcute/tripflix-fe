import { createBrowserNotificationAudio, type NotificationAudioClip } from './browser-notification-audio';

const MIN_SOUND_INTERVAL_MS = 3000;
export const TRIPI_NOTIFICATION_SOUND = '/audio/tripi-notification.wav?v=1a5762e57a29';

/** Chỉ gọi khi thẻ thực sự được trình bày; lịch sử, push OS và tab thua claim không phát tiếng. */
export function createTripiSoundPlayer(
  options: {
    createAudio?: () => NotificationAudioClip;
    now?: () => number;
    onBlocked?: () => void;
    onReady?: () => void;
  } = {},
) {
  const createAudio = options.createAudio ?? (() => createBrowserNotificationAudio(TRIPI_NOTIFICATION_SOUND));
  const now = options.now ?? Date.now;
  let audio: NotificationAudioClip | null = null;
  let lastPlayedAt = -Infinity;
  let generation = 0;
  const seen = new Set<string>();
  const stop = () => {
    generation += 1;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };
  const play = async (): Promise<boolean> => {
    try {
      audio ??= createAudio();
      audio.preload = 'auto';
      audio.volume = 0.65;
      audio.pause();
      audio.currentTime = 0;
      const started = ++generation;
      await audio.play();
      if (started === generation) options.onReady?.();
      return started === generation;
    } catch (error) {
      // Trình duyệt có thể chặn autoplay trước tương tác đầu tiên; thẻ vẫn phải hiện bình thường.
      if (!(error instanceof DOMException && error.name === 'AbortError')) options.onBlocked?.();
      return false;
    }
  };
  const prime = async (): Promise<boolean> => {
    const started = generation;
    try {
      audio ??= createAudio();
      const ready = audio.unlock ? await audio.unlock() : true;
      if (generation !== started) return false;
      if (ready) options.onReady?.();
      else options.onBlocked?.();
      return ready;
    } catch {
      if (generation === started) options.onBlocked?.();
      return false;
    }
  };
  const clearNotifications = () => {
    stop();
    seen.clear();
    lastPlayedAt = -Infinity;
  };
  return {
    async notify(key: string, preference: { enabled: boolean }): Promise<boolean> {
      if (seen.has(key)) return false;
      seen.add(key);
      if (seen.size > 256) seen.delete(seen.values().next().value!);
      if (!preference.enabled || now() - lastPlayedAt < MIN_SOUND_INTERVAL_MS) return false;
      lastPlayedAt = now();
      return play();
    },
    prime,
    async preview() {
      return (await prime()) ? play() : false;
    },
    stop,
    clearNotifications,
    reset() {
      clearNotifications();
      audio?.dispose?.();
      audio = null;
    },
  };
}
