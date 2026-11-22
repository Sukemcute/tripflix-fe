/** Tải âm báo tĩnh cùng origin, không gửi cookie/token qua bộ HTTP dành cho backend. */
export async function loadWebAudioAsset(path: string): Promise<ArrayBuffer> {
  const origin = globalThis.location?.origin;
  if (!origin || !path.startsWith('/audio/') || path.includes('\\') || path.length > 2048) {
    throw new Error('Invalid audio asset');
  }
  const url = new URL(path, origin);
  if (url.origin !== origin || !url.pathname.startsWith('/audio/') || !url.pathname.endsWith('.wav')) {
    throw new Error('Invalid audio asset');
  }
  const response = await fetch(url.href, {
    credentials: 'omit',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Notification audio unavailable');
  return response.arrayBuffer();
}
