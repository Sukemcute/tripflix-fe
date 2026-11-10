import { gcm } from '@noble/ciphers/aes.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { authControllerPasswordKey } from './generated/core-api/auth/auth';
import { HttpError, type HttpRequestOptions } from './http';
import { readEntity } from './response';

/**
 * Mã hoá mật khẩu trước khi gửi (TF056, giống Facebook "#PWD_BROWSER"): payload, log, proxy không có mật khẩu gốc.
 * Phải khớp từng byte với core-api (access/auth/domain/password-envelope.ts, infra/x25519-password-keyring.ts):
 * X25519 → HKDF-SHA256(salt = khoá tạm ‖ khoá server, info "tripflix-pwd-v1") → AES-256-GCM, AAD gắn mục đích và email.
 */
export type PasswordPurpose = 'login' | 'register' | 'change_current' | 'change_new' | 'reset';

export interface PasswordKey {
  keyId: string;
  /** X25519 32 byte, base64url. */
  publicKey: string;
}

/** Mã lỗi core-api trả khi chuỗi mã hoá hết hạn, sai khoá hoặc đã dùng: lấy lại khoá rồi thử lại. */
export const PASSWORD_ENVELOPE_INVALID_CODE = 'password_envelope_invalid';

const PREFIX = '#TFPWD';
const VERSION = 1;
const HKDF_INFO = utf8ToBytes('tripflix-pwd-v1');
/** Mục đích có email trong AAD; đổi và đặt lại mật khẩu dùng chuỗi rỗng. */
const PURPOSES_WITH_EMAIL: ReadonlySet<PasswordPurpose> = new Set(['login', 'register']);

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Email giống core-api normalizeEmail: bỏ khoảng trắng hai đầu, chữ thường. */
export function passwordSubject(purpose: PasswordPurpose, email: string | undefined): string {
  return PURPOSES_WITH_EMAIL.has(purpose) ? (email ?? '').trim().toLowerCase() : '';
}

/** Trả chuỗi "#TFPWD:1:<keyId>:<ts>:<base64url(khoá tạm ‖ iv ‖ bản mã ‖ tag)>". nowSeconds theo giờ server. */
export function encryptPassword(
  key: PasswordKey,
  password: string,
  options: { purpose: PasswordPurpose; email?: string; nowSeconds: number },
): string {
  const serverPublic = fromBase64Url(key.publicKey);
  if (serverPublic.length !== 32) throw new Error('Khoá mã hoá mật khẩu không hợp lệ');
  const ts = Math.floor(options.nowSeconds);
  const ephemeralSecret = x25519.utils.randomSecretKey();
  const ephemeralPublic = x25519.getPublicKey(ephemeralSecret);
  const shared = x25519.getSharedSecret(ephemeralSecret, serverPublic);
  const aesKey = hkdf(sha256, shared, concatBytes(ephemeralPublic, serverPublic), HKDF_INFO, 32);
  const iv = randomBytes(12);
  const aad = utf8ToBytes(
    `tripflix-pwd|${VERSION}|${options.purpose}|${key.keyId}|${ts}|${passwordSubject(options.purpose, options.email)}`,
  );
  const plaintext = utf8ToBytes(JSON.stringify({ p: password, n: toBase64Url(randomBytes(16)), t: ts }));
  const sealed = gcm(aesKey, iv, aad).encrypt(plaintext);
  return `${PREFIX}:${VERSION}:${key.keyId}:${ts}:${toBase64Url(concatBytes(ephemeralPublic, iv, sealed))}`;
}

/** Khoá đã lấy từ GET /auth/password-key, kèm lệch đồng hồ so với server. */
interface CachedKey {
  key: PasswordKey;
  offsetSeconds: number;
  fetchedAt: number;
}

const KEY_TTL_MS = 10 * 60_000;
/** entry null: server chưa bật mã hoá; vẫn nhớ 10 phút để không gọi lại API trả 503 mỗi lần đăng nhập. */
let cached: { entry: CachedKey | null; fetchedAt: number } | null = null;
let pending: Promise<CachedKey | null> | null = null;

/** Ép lấy lại khoá ở lần gửi sau. */
export function resetPasswordKeyCache(): void {
  cached = null;
  pending = null;
}

/** Nạp sẵn khoá (hoặc null: server chưa bật mã hoá) mà không gọi API. Dùng trong test. */
export function primePasswordKeyCache(key: PasswordKey | null, offsetSeconds = 0): void {
  pending = null;
  cached = { entry: key ? { key, offsetSeconds, fetchedAt: Date.now() } : null, fetchedAt: Date.now() };
}

/**
 * null: server chưa bật mã hoá (503) hoặc là bản cũ chưa có API này (404). Khi đó gửi mật khẩu thường,
 * server chỉ nhận khi chưa bật AUTH_PASSWORD_ENCRYPTION_REQUIRED.
 */
async function loadKey(force: boolean): Promise<CachedKey | null> {
  if (!force && cached && Date.now() - cached.fetchedAt < KEY_TTL_MS) return cached.entry;
  if (!force && pending) return pending;
  pending = (async () => {
    try {
      const options: HttpRequestOptions = { skipAuthorization: true, skipAuthRefresh: true };
      const res = await authControllerPasswordKey(options);
      const body = readEntity(res.data, ['keyId', 'publicKey']);
      const offsetSeconds = typeof body.serverTime === 'number' ? body.serverTime - Date.now() / 1000 : 0;
      const entry = {
        key: { keyId: body.keyId, publicKey: body.publicKey },
        offsetSeconds,
        fetchedAt: Date.now(),
      };
      cached = { entry, fetchedAt: entry.fetchedAt };
      return entry;
    } catch (error) {
      if (error instanceof HttpError && (error.status === 503 || error.status === 404)) {
        cached = { entry: null, fetchedAt: Date.now() };
        return null;
      }
      throw error;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

export interface PasswordField {
  /** Tên trường mật khẩu thường, ví dụ password. */
  plain: string;
  /** Tên trường đã mã hoá, ví dụ encPassword. */
  encrypted: string;
  value: string;
  purpose: PasswordPurpose;
}

function isEnvelopeRejected(error: unknown): boolean {
  if (!(error instanceof HttpError) || error.status !== 400) return false;
  const body = error.body as { code?: unknown } | null;
  return body?.code === PASSWORD_ENVELOPE_INVALID_CODE;
}

/**
 * Dựng các trường mật khẩu (mã hoá nếu server có khoá) rồi gọi send. Chuỗi bị từ chối (khoá đổi, server khởi động lại
 * với khoá tạm, đồng hồ lệch) thì lấy khoá mới, mã hoá lại và gửi thêm đúng một lần.
 */
export async function sendWithPasswords<T>(
  fields: PasswordField[],
  email: string | undefined,
  send: (passwordFields: Record<string, string>) => Promise<T>,
): Promise<T> {
  const build = (entry: CachedKey | null) => {
    const out: Record<string, string> = {};
    for (const f of fields) {
      if (entry) {
        const nowSeconds = Date.now() / 1000 + entry.offsetSeconds;
        out[f.encrypted] = encryptPassword(entry.key, f.value, { purpose: f.purpose, email, nowSeconds });
      } else {
        out[f.plain] = f.value;
      }
    }
    return out;
  };
  const entry = await loadKey(false);
  try {
    return await send(build(entry));
  } catch (error) {
    if (!entry || !isEnvelopeRejected(error)) throw error;
    return send(build(await loadKey(true)));
  }
}
