import { HttpError } from './http';

/** Asset tĩnh dùng URL gốc, không qua gateway, không gửi thông tin đăng nhập của phiên API. */
export async function readPublicAsset(url: string): Promise<Blob> {
  const response = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
  if (!response.ok) throw new HttpError(response.status, 'Cannot load public asset');
  return response.blob();
}
