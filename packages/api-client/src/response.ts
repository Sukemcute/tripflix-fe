import { HttpError } from './http';

type ApiErrorKind =
  'network' | 'expired' | 'forbidden' | 'missing' | 'conflict' | 'rateLimit' | 'invalid' | 'error';
const HTTP_ERROR_KINDS: Partial<Record<number, ApiErrorKind>> = {
  400: 'invalid',
  401: 'expired',
  403: 'forbidden',
  404: 'missing',
  409: 'conflict',
  422: 'invalid',
  429: 'rateLimit',
};

export function getApiErrorKind(error: unknown): ApiErrorKind {
  if (error instanceof TypeError) return 'network';
  if (!(error instanceof HttpError)) return 'error';
  return HTTP_ERROR_KINDS[error.status] ?? 'error';
}

export type AuthAction =
  'login' | 'register' | 'google' | 'forgotPassword' | 'resetPassword' | 'changePassword';
type AuthErrorKind =
  | 'wrongCredentials'
  | 'accountExists'
  | 'tooManyAttempts'
  | 'googleFailed'
  | 'googleUnavailable'
  | 'resetLinkInvalid'
  | 'wrongCurrentPassword';

/** 400 from ZodBody carries per-field errors; a business 400 (wrong token, wrong password) does not. */
function hasFieldErrors(error: HttpError): boolean {
  const body = error.body as { errors?: unknown } | null;
  return typeof body === 'object' && body !== null && Array.isArray(body.errors);
}

/**
 * Same HTTP status means different things per auth screen (409 on register is a taken email, 400 on reset is an
 * expired link). Returns the `vi.api` key to show, or null to fall back to getApiErrorKind.
 */
export function getAuthErrorKind(error: unknown, action: AuthAction): AuthErrorKind | null {
  if (!(error instanceof HttpError)) return null;
  if (error.status === 429) return 'tooManyAttempts';
  switch (action) {
    case 'login':
      return error.status === 401 ? 'wrongCredentials' : null;
    case 'register':
      return error.status === 409 ? 'accountExists' : null;
    case 'google':
      if (error.status === 401) return 'googleFailed';
      return error.status === 503 ? 'googleUnavailable' : null;
    case 'resetPassword':
      return error.status === 400 && !hasFieldErrors(error) ? 'resetLinkInvalid' : null;
    case 'changePassword':
      return error.status === 400 && !hasFieldErrors(error) ? 'wrongCurrentPassword' : null;
    case 'forgotPassword':
      return null;
  }
}

/** Check essential response fields at the HTTP boundary, including schemas that used to be undocumented. */
export function readEntity<T>(value: T, fields: readonly string[]): Exclude<T, void | null | undefined> {
  if (typeof value !== 'object' || value === null || fields.some((key) => !(key in value))) {
    throw new Error('Unexpected API response');
  }
  return value as Exclude<T, void | null | undefined>;
}
export function readPage<T extends { items: unknown[] }>(value: T | void): T {
  if (!value || !Array.isArray(value.items)) throw new Error('Unexpected API page');
  return value;
}
