// Hàm fetch chung mà code Orval sinh ra gọi tới (orval.config.ts → mutator).
// Lo: địa chỉ gateway, gắn Bearer token, tự refresh một lần khi 401, Idempotency-Key cho lệnh ghi, x-request-id.
// App cấu hình một lần lúc khởi động bằng configureHttp(). Không tự viết fetch gọi backend ở chỗ khác.

export interface HttpConfig {
  /** Địa chỉ gateway, ví dụ http://localhost:8080. Web: NEXT_PUBLIC_API_URL, mobile: EXPO_PUBLIC_API_URL. */
  baseUrl: string;
  /** Trả access token hiện tại, hoặc null nếu chưa đăng nhập. */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Gọi khi gặp 401: đổi refresh token lấy access token mới. Trả true nếu thành công. */
  refreshAccessToken?: () => Promise<boolean>;
  credentials?: RequestCredentials;
}

export interface HttpRequestOptions extends RequestInit {
  /** Auth endpoints must not recursively try to refresh themselves. */
  skipAuthRefresh?: boolean;
  skipAuthorization?: boolean;
}

let config: HttpConfig = { baseUrl: '' };

export function configureHttp(next: HttpConfig) {
  config = next;
}

/** Cấu hình hiện tại, cho kết nối không đi qua fetch (WebSocket /ws) dùng chung địa chỉ gateway và token. */
export function getHttpConfig(): Readonly<HttpConfig> {
  return config;
}

/** Kết quả trả về, đúng dạng Orval (client fetch) mong đợi. */
export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 3) | 8).toString(16);
  });

async function send(
  requestConfig: HttpConfig,
  url: string,
  init: RequestInit,
  idempotencyKey: string | undefined,
  skipAuthorization: boolean | undefined,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = skipAuthorization ? null : await requestConfig.getAccessToken?.();
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (idempotencyKey && !headers.has('idempotency-key')) headers.set('idempotency-key', idempotencyKey);
  if (!headers.has('x-request-id')) headers.set('x-request-id', newId());
  return fetch(`${requestConfig.baseUrl.replace(/\/$/, '')}${url}`, {
    credentials: requestConfig.credentials,
    ...init,
    headers,
  });
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const type = res.headers.get('content-type') ?? '';
  return type.includes('application/json') ? res.json() : res.text();
}

/**
 * Gửi request có Bearer token và tự refresh một lần khi 401, trả Response thô (chưa đọc body).
 * Dùng cho phản hồi dạng stream (SSE) mà code Orval sinh ra không đọc được.
 */
export async function httpRaw(url: string, options: HttpRequestOptions & { baseUrl?: string } = {}) {
  const { skipAuthRefresh, skipAuthorization, baseUrl, ...init } = options;
  const requestConfig = baseUrl === undefined ? config : { ...config, baseUrl };
  const method = (init.method ?? 'GET').toUpperCase();
  // Cùng một key cho lần gửi lại sau refresh, để server không xử lý lệnh ghi hai lần.
  const idempotencyKey = WRITE_METHODS.has(method) ? newId() : undefined;

  let res = await send(requestConfig, url, init, idempotencyKey, skipAuthorization);
  if (
    res.status === 401 &&
    !skipAuthRefresh &&
    requestConfig.refreshAccessToken &&
    (await requestConfig.refreshAccessToken())
  ) {
    res = await send(requestConfig, url, init, idempotencyKey, skipAuthorization);
  }
  return res;
}

export async function http<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
  const res = await httpRaw(url, options);
  const data = await readBody(res);
  if (!res.ok) throw new HttpError(res.status, data);
  return { data, status: res.status, headers: res.headers } as T;
}

export default http;
