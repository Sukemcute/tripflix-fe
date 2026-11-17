import { attachReelVideoSource, releaseReelVideoSource, type ReelVideoSource } from './reel-post';

/** Phần của thẻ <video> cần để chọn cách phát và gắn hls.js (test được không cần DOM). */
export type ReelHlsVideo = ReelVideoSource & Pick<HTMLVideoElement, 'canPlayType'>;

/** Phần của hls.js đang dùng, để test thay bằng bản giả. */
export interface ReelHlsPlayer {
  loadSource(url: string): void;
  attachMedia(video: HTMLMediaElement): void;
  on(event: 'hlsError', listener: (event: 'hlsError', data: ReelHlsErrorData) => void): void;
  destroy(): void;
}
export interface ReelHlsErrorData {
  fatal: boolean;
  type: string;
  response?: { code?: number };
}
export interface ReelHlsLibrary {
  isSupported(): boolean;
  create(config: { xhrSetup: (xhr: XMLHttpRequest) => void }): ReelHlsPlayer;
}

/** Tải hls.js lúc cần: Safari và Chrome Android phát HLS sẵn, không phải tải thêm thư viện. */
export async function loadHlsLibrary(): Promise<ReelHlsLibrary> {
  const { default: Hls } = await import('hls.js');
  return {
    isSupported: () => Hls.isSupported(),
    create: (config) => new Hls(config) as unknown as ReelHlsPlayer,
  };
}

/** Trình duyệt tự phát HLS bằng thẻ <video> (Safari, Chrome Android). */
export function canPlayHlsNatively(video: Pick<HTMLVideoElement, 'canPlayType'>): boolean {
  return video.canPlayType('application/vnd.apple.mpegurl') !== '';
}

/**
 * Lỗi tải có thể do cookie CloudFront hết hạn hoặc chưa có: 403, hoặc mã 0 khi trình duyệt chặn phản hồi
 * lỗi không kèm header CORS. Chỉ lỗi mạng làm hỏng hẳn việc phát mới tính.
 */
export function isPlaybackAuthError(data: ReelHlsErrorData): boolean {
  if (!data.fatal || data.type !== 'networkError') return false;
  const code = data.response?.code;
  return code === 403 || code === 0;
}

/**
 * Gắn nguồn HLS cho video Reel (TF64). Trình duyệt phát sẵn thì dùng thẻ <video> như cũ (tự gửi cookie vì cùng
 * site). Còn lại (Chrome, Firefox máy tính) dùng hls.js, bật withCredentials để XHR gửi cookie CloudFront.
 * Không phát được bằng cả hai thì vẫn gắn src để thẻ <video> báo lỗi như trước.
 * Trả về hàm dọn cho useEffect; dọn trước khi hls.js tải xong thì không gắn nữa.
 */
export function attachReelHlsSource(
  video: ReelHlsVideo,
  url: string,
  {
    onAuthError,
    onFatalError,
    loadLibrary = loadHlsLibrary,
  }: {
    /** Lỗi có thể do cookie: xin cookie mới rồi gắn lại. */
    onAuthError: () => void;
    /** Lỗi khác làm dừng phát. */
    onFatalError: () => void;
    loadLibrary?: () => Promise<ReelHlsLibrary>;
  },
): () => void {
  if (canPlayHlsNatively(video)) return attachReelVideoSource(video, url);

  let isReleased = false;
  let player: ReelHlsPlayer | null = null;
  void loadLibrary()
    .then((library) => {
      if (isReleased) return;
      if (!library.isSupported()) {
        video.src = url;
        return;
      }
      player = library.create({
        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        },
      });
      player.on('hlsError', (_event, data) => {
        if (!data.fatal) return;
        if (isPlaybackAuthError(data)) onAuthError();
        else onFatalError();
      });
      player.loadSource(url);
      player.attachMedia(video as HTMLMediaElement);
    })
    .catch(() => {
      if (!isReleased) onFatalError();
    });

  return () => {
    isReleased = true;
    player?.destroy();
    player = null;
    releaseReelVideoSource(video);
  };
}
