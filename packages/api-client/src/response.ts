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
