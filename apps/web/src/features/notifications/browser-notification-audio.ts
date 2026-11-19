import { loadWebAudioAsset } from '@tripflix/api-client';

export interface NotificationAudioClip {
  currentTime: number;
  volume: number;
  preload: string;
  play(): Promise<void>;
  pause(): void;
  unlock?: () => Promise<boolean>;
  dispose?: () => void;
}

/** Resume trong thao tác thật của người dùng; các thông báo sau dùng lại context đã được phép. */
export function createBrowserNotificationAudio(url: string): NotificationAudioClip {
  if (typeof AudioContext === 'undefined') return new Audio(url);
  let context: AudioContext | null = null;
  let loading: Promise<AudioBuffer> | null = null;
  let source: AudioBufferSourceNode | null = null;
  let gain: GainNode | null = null;
  let generation = 0;
  let disposed = false;
  const load = (audioContext: AudioContext) => {
    loading ??= loadWebAudioAsset(url)
      .then((buffer) => audioContext.decodeAudioData(buffer))
      .catch((error: unknown) => {
        loading = null;
        throw error;
      });
    return loading;
  };
  const pause = () => {
    generation += 1;
    const previous = source;
    source = null;
    if (previous) {
      previous.onended = null;
      previous.stop();
      previous.disconnect();
    }
    gain?.disconnect();
    gain = null;
  };
  const clip: NotificationAudioClip = {
    currentTime: 0,
    volume: 0.65,
    preload: 'auto',
    async unlock() {
      if (disposed) return false;
      context ??= new AudioContext();
      // Gọi resume trước await để giữ user activation của pointer/keyboard hoặc nút Nghe thử.
      const resumed = context.resume();
      await Promise.all([resumed, load(context)]);
      return !disposed && context.state === 'running';
    },
    async play() {
      const current = context;
      if (!current || current.state !== 'running')
        throw new DOMException('Audio needs user interaction', 'NotAllowedError');
      const started = ++generation;
      const buffer = await load(current);
      if (disposed || generation !== started) throw new DOMException('Audio cancelled', 'AbortError');
      if (current.state !== 'running')
        throw new DOMException('Audio needs user interaction', 'NotAllowedError');
      const node = current.createBufferSource();
      const volume = current.createGain();
      node.buffer = buffer;
      volume.gain.value = clip.volume;
      node.connect(volume);
      volume.connect(current.destination);
      node.onended = () => {
        node.disconnect();
        volume.disconnect();
        if (source === node) {
          source = null;
          gain = null;
        }
      };
      source = node;
      gain = volume;
      node.start();
    },
    pause,
    dispose() {
      disposed = true;
      pause();
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
      context = null;
      loading = null;
    },
  };
  return clip;
}
