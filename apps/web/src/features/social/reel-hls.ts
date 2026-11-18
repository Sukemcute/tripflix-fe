import { releaseReelVideoSource, type ReelVideoSource } from './reel-post';

/** Phần của thẻ <video> cần để chọn cách phát và gắn hls.js (test được không cần DOM). */
export type ReelHlsVideo = ReelVideoSource &
  Pick<
    HTMLVideoElement,
    'canPlayType' | 'addEventListener' | 'removeEventListener' | 'play' | 'paused' | 'readyState' | 'currentTime'
  >;

/** HTMLMediaElement.HAVE_FUTURE_DATA: đủ dữ liệu để chạy tiếp ngay (hằng số của DOM, không có trong Node khi test). */
const HAVE_FUTURE_DATA = 3;

/** Một mức chất lượng trong master playlist (hls.js đọc từ RESOLUTION). */
export interface ReelHlsLevel {
  width?: number;
  height?: number;
}

/** Phần của hls.js đang dùng, để test thay bằng bản giả. */
export interface ReelHlsPlayer {
  /** hls.js đọc lại cấu hình bộ đệm mỗi lần quyết định tải segment, nên đổi lúc đang chạy là có tác dụng. */
  config: { maxBufferLength: number; maxMaxBufferLength: number };
  startLevel: number;
  loadSource(url: string): void;
  attachMedia(video: HTMLMediaElement): void;
  startLoad(startPosition?: number): void;
  on(event: 'hlsError', listener: (event: 'hlsError', data: ReelHlsErrorData) => void): void;
  on(
    event: 'hlsManifestParsed',
    listener: (event: 'hlsManifestParsed', data: { levels: ReelHlsLevel[] }) => void,
  ): void;
  destroy(): void;
}
export interface ReelHlsErrorData {
  fatal: boolean;
  type: string;
  response?: { code?: number };
}
export interface ReelHlsConfig {
  xhrSetup: (xhr: XMLHttpRequest) => void;
  autoStartLoad: boolean;
  maxBufferLength: number;
  maxMaxBufferLength: number;
  abrEwmaDefaultEstimate: number;
}
export interface ReelHlsLibrary {
  isSupported(): boolean;
  create(config: ReelHlsConfig): ReelHlsPlayer;
}

/** Đổi số giây đệm trước của một Reel khi nó đổi vị trí (phía trước → đang xem → phía sau). */
export interface ReelHlsBufferControl {
  setBufferSeconds(seconds: number): void;
}

/** Mức bắt đầu: 720p như Reels mobile (cạnh ngắn của video dọc 720×1280). */
export const REEL_START_SHORT_SIDE = 720;
/**
 * Ước lượng băng thông ban đầu cho ABR (mặc định của hls.js là 500 kbps, nên nó chọn 360p rồi mới tăng).
 * Đo thật được sau segment đầu: mạng chậm thì ABR tự hạ mức.
 */
export const REEL_INITIAL_BANDWIDTH_BPS = 5_000_000;
/** Trình duyệt tự phát: mức đang thử chưa tải được hình đầu sau chừng này thì lùi một mức, như Reels mobile. */
export const REEL_RENDITION_TIMEOUT_MS = 8_000;
const DEFAULT_BUFFER_SECONDS = 30;

/** Tải hls.js lúc cần: Safari và Chrome Android phát HLS sẵn, không phải tải thêm thư viện. */
export async function loadHlsLibrary(): Promise<ReelHlsLibrary> {
  const { default: Hls } = await import('hls.js');
  return {
    isSupported: () => Hls.isSupported(),
    create: (config) => new Hls(config) as unknown as ReelHlsPlayer,
  };
}

/** Trình duyệt tự phát HLS bằng thẻ <video> (Safari, Chrome Android, Chrome/Edge máy tính bản mới). */
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
 * Chỉ số mức bắt đầu: mức nét nhất có cạnh ngắn không quá `maxShortSide` (video chỉ có 360p, 540p thì lấy 540p).
 * Mọi mức đều lớn hơn thì lấy mức nhỏ nhất. Playlist không ghi độ phân giải thì trả -1 để hls.js tự chọn.
 */
export function pickReelStartLevel(levels: readonly ReelHlsLevel[], maxShortSide = REEL_START_SHORT_SIDE): number {
  const sized = levels
    .map((level, index) => ({ index, shortSide: Math.min(level.width ?? 0, level.height ?? 0) }))
    .filter((level) => level.shortSide > 0);
  if (sized.length === 0) return -1;
  const fitting = sized.filter((level) => level.shortSide <= maxShortSide);
  const pool = fitting.length > 0 ? fitting : sized;
  const pick = fitting.length > 0 ? Math.max : Math.min;
  const target = pick(...pool.map((level) => level.shortSide));
  return pool.find((level) => level.shortSide === target)!.index;
}

/**
 * Trình duyệt tự phát HLS tự đo băng thông bằng mức thấp nhất (360p) rồi mới tăng, nên không gắn master mà gắn
 * thẳng playlist của mức nét nhất (`sources[0]`, thường 720p). Mức đó lỗi, hoặc người xem bấm phát mà quá
 * REEL_RENDITION_TIMEOUT_MS chưa có hình, thì lùi sang nguồn kế tiếp; nguồn cuối là master.
 *
 * Hết nguồn mà vẫn lỗi: thẻ <video> không cho biết mã lỗi, nên có thể cookie CloudFront đã hết hạn (6 giờ). Gọi
 * onAuthError một lần để xin cookie mới và gắn lại; lỗi tiếp mới báo lỗi phát (onFatalError).
 */
function attachNativeSources(
  video: ReelHlsVideo,
  sources: readonly string[],
  { onAuthError, onFatalError }: { onAuthError: () => void; onFatalError: () => void },
): () => void {
  let sourceIndex = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let hasRequestedAuth = false;
  const fallBack = () => {
    clearTimeout(timeout);
    if (sourceIndex >= sources.length - 1) {
      if (hasRequestedAuth) {
        onFatalError();
      } else {
        hasRequestedAuth = true;
        onAuthError();
      }
      return;
    }
    const shouldResume = !video.paused;
    // Đổi nguồn thì thẻ <video> về đầu: nhớ chỗ đang xem để phát tiếp từ đó.
    resumeAt = video.currentTime;
    sourceIndex += 1;
    video.src = sources[sourceIndex] ?? '';
    if (shouldResume) void video.play().catch(() => {});
  };
  let resumeAt = 0;
  const restorePosition = () => {
    if (resumeAt > 0) video.currentTime = resumeAt;
    resumeAt = 0;
  };
  // Chỉ hẹn giờ khi người xem đang chờ video này: đã bấm phát mà chưa có hình, hoặc đang phát thì đứng chờ tải
  // (mạng yếu; một mức cố định thì trình duyệt không tự hạ mức). Video tải sẵn ngoài màn hình không hẹn giờ:
  // trình duyệt có thể hoãn tải chúng, lùi mức lúc đó chỉ làm tải lại từ đầu.
  const armTimeout = () => {
    clearTimeout(timeout);
    if (video.paused || video.readyState >= HAVE_FUTURE_DATA || sourceIndex >= sources.length - 1) return;
    timeout = setTimeout(fallBack, REEL_RENDITION_TIMEOUT_MS);
  };
  const disarmTimeout = () => clearTimeout(timeout);
  video.addEventListener('error', fallBack);
  video.addEventListener('play', armTimeout);
  video.addEventListener('waiting', armTimeout);
  video.addEventListener('playing', disarmTimeout);
  video.addEventListener('pause', disarmTimeout);
  video.addEventListener('loadedmetadata', restorePosition);
  video.src = sources[0] ?? '';
  return () => {
    clearTimeout(timeout);
    video.removeEventListener('error', fallBack);
    video.removeEventListener('play', armTimeout);
    video.removeEventListener('waiting', armTimeout);
    video.removeEventListener('playing', disarmTimeout);
    video.removeEventListener('pause', disarmTimeout);
    video.removeEventListener('loadedmetadata', restorePosition);
    releaseReelVideoSource(video);
  };
}

/**
 * Gắn nguồn HLS cho video Reel (TF64). Trình duyệt phát sẵn thì dùng thẻ <video> (tự gửi cookie vì cùng site),
 * bắt đầu từ `sources` (mức nét nhất trước, master cuối). Còn lại (Firefox máy tính) dùng hls.js, bật withCredentials
 * để XHR gửi cookie CloudFront, chọn 720p ngay khi đọc xong master playlist.
 * Không phát được bằng cả hai thì vẫn gắn src, thẻ <video> lỗi thì báo onFatalError.
 *
 * `bufferSeconds` là số giây hls.js đệm trước lúc gắn; `onBufferControl` trả về cách đổi số này khi Reel đổi vị trí.
 * Trình duyệt tự phát không cho giới hạn bộ đệm: Reel không còn gần bài đang xem thì nhả nguồn (xoá bộ đệm).
 *
 * Trả về hàm dọn cho useEffect; dọn trước khi hls.js tải xong thì không gắn nữa.
 */
export function attachReelHlsSource(
  video: ReelHlsVideo,
  url: string,
  {
    onAuthError,
    onFatalError,
    sources = [url],
    bufferSeconds = DEFAULT_BUFFER_SECONDS,
    onBufferControl,
    loadLibrary = loadHlsLibrary,
  }: {
    /** Lỗi có thể do cookie: xin cookie mới rồi gắn lại. */
    onAuthError: () => void;
    /** Lỗi khác làm dừng phát. */
    onFatalError: () => void;
    /** Nguồn cho trình duyệt tự phát, mức nét nhất trước, master cuối (getReelPlaybackSources). */
    sources?: readonly string[];
    bufferSeconds?: number;
    onBufferControl?: (control: ReelHlsBufferControl) => void;
    loadLibrary?: () => Promise<ReelHlsLibrary>;
  },
): () => void {
  if (canPlayHlsNatively(video)) {
    return attachNativeSources(video, sources.length > 0 ? sources : [url], { onAuthError, onFatalError });
  }

  let isReleased = false;
  let player: ReelHlsPlayer | null = null;
  let releaseNative: (() => void) | null = null;
  void loadLibrary()
    .then((library) => {
      if (isReleased) return;
      if (!library.isSupported()) {
        releaseNative = attachNativeSources(video, [url], { onAuthError, onFatalError });
        return;
      }
      const created = library.create({
        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        },
        autoStartLoad: false,
        maxBufferLength: bufferSeconds,
        maxMaxBufferLength: bufferSeconds,
        abrEwmaDefaultEstimate: REEL_INITIAL_BANDWIDTH_BPS,
      });
      player = created;
      created.on('hlsError', (_event, data) => {
        if (!data.fatal) return;
        if (isPlaybackAuthError(data)) onAuthError();
        else onFatalError();
      });
      created.on('hlsManifestParsed', (_event, data) => {
        created.startLevel = pickReelStartLevel(data.levels);
        created.startLoad(-1);
      });
      onBufferControl?.({
        setBufferSeconds: (seconds) => {
          created.config.maxBufferLength = seconds;
          created.config.maxMaxBufferLength = seconds;
        },
      });
      created.loadSource(url);
      created.attachMedia(video as HTMLMediaElement);
    })
    .catch(() => {
      if (!isReleased) onFatalError();
    });

  return () => {
    isReleased = true;
    player?.destroy();
    player = null;
    if (releaseNative) releaseNative();
    else releaseReelVideoSource(video);
  };
}
