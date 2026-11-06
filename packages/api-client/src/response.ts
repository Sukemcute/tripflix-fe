import { HttpError } from './http';

type ApiErrorKind =
  | 'network'
  | 'expired'
  | 'forbidden'
  | 'emailUnverified'
  | 'missing'
  | 'conflict'
  | 'rateLimit'
  | 'invalid'
  | 'error';
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
  const body = error.body as { code?: unknown } | null;
  if (error.status === 403 && body?.code === 'email_unverified') return 'emailUnverified';
  return HTTP_ERROR_KINDS[error.status] ?? 'error';
}

export type AuthAction =
  'login' | 'register' | 'google' | 'forgotPassword' | 'resetPassword' | 'changePassword';
type AuthErrorKind =
  | 'wrongCredentials'
  | 'accountExists'
  | 'registrationCodeInvalid'
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
      if (error.status === 409) return 'accountExists';
      return error.status === 400 && !hasFieldErrors(error) ? 'registrationCodeInvalid' : null;
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

/** 429 của core-api có retryAfterSeconds trong body (thời gian phải đợi); không có thì undefined. */
export function getRetryAfterSeconds(error: unknown): number | undefined {
  if (!(error instanceof HttpError) || error.status !== 429) return;
  const seconds = (error.body as { retryAfterSeconds?: unknown } | null)?.retryAfterSeconds;
  return typeof seconds === 'number' && seconds > 0 ? Math.ceil(seconds) : undefined;
}

export function getRegistrationFieldError(error: unknown): string | undefined {
  if (!(error instanceof HttpError) || error.status !== 400 || !hasFieldErrors(error)) return;
  const { errors } = error.body as { errors: { message?: unknown }[] };
  const message = errors[0]?.message;
  return typeof message === 'string' ? message : undefined;
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
