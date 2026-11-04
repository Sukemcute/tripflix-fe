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
}

let config: HttpConfig = { baseUrl: '' };

export function configureHttp(next: HttpConfig) {
  config = next;
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

const newId = () => globalThis.crypto.randomUUID();

async function send(url: string, init: RequestInit, idempotencyKey: string | undefined): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await config.getAccessToken?.();
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (idempotencyKey && !headers.has('idempotency-key')) headers.set('idempotency-key', idempotencyKey);
  if (!headers.has('x-request-id')) headers.set('x-request-id', newId());
  return fetch(`${config.baseUrl}${url}`, { ...init, headers });
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const type = res.headers.get('content-type') ?? '';
  return type.includes('application/json') ? res.json() : res.text();
}

export async function http<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  // Cùng một key cho lần gửi lại sau refresh, để server không xử lý lệnh ghi hai lần.
  const idempotencyKey = WRITE_METHODS.has(method) ? newId() : undefined;

  let res = await send(url, init, idempotencyKey);
  if (res.status === 401 && config.refreshAccessToken && (await config.refreshAccessToken())) {
    res = await send(url, init, idempotencyKey);
  }

  const data = await readBody(res);
  if (!res.ok) throw new HttpError(res.status, data);
  return { data, status: res.status, headers: res.headers } as T;
}

export default http;
