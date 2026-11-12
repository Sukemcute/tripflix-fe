export type BrowserProofPurpose = 'login' | 'google' | 'refresh';
export const BROWSER_PROOF_HEADER = 'X-Tripflix-Session-Proof';

const STORE = 'keys';
const SESSION_KEY = 'refresh-signing';
let keyPromise: Promise<CryptoKeyPair> | undefined;

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tripflix-session', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readKey(database: IDBDatabase): Promise<CryptoKeyPair | undefined> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(SESSION_KEY);
    request.onsuccess = () => resolve(request.result as CryptoKeyPair | undefined);
    request.onerror = () => reject(request.error);
  });
}

function addKey(database: IDBDatabase, key: CryptoKeyPair): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).add(key, SESSION_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
  });
}

async function loadKey(): Promise<CryptoKeyPair> {
  const database = await openKeyDatabase();
  try {
    const stored = await readKey(database);
    if (stored) return stored;
    const key = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    try {
      await addKey(database, key);
      return key;
    } catch (error) {
      // Một tab khác có thể vừa lưu khóa. Dùng khóa thắng giao dịch IndexedDB.
      if (!(error instanceof DOMException) || error.name !== 'ConstraintError') throw error;
      const winner = await readKey(database);
      if (!winner) throw error;
      return winner;
    }
  } finally {
    database.close();
  }
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export async function signBrowserProof(purpose: BrowserProofPurpose): Promise<string> {
  keyPromise ??= loadKey().catch((error: unknown) => {
    keyPromise = undefined;
    throw error;
  });
  const key = await keyPromise;
  const { kty, crv, x, y } = await crypto.subtle.exportKey('jwk', key.publicKey);
  const encoder = new TextEncoder();
  const header = base64Url(encoder.encode(JSON.stringify({ alg: 'ES256', typ: 'tripflix-session+jwt', jwk: { kty, crv, x, y } })));
  const payload = base64Url(encoder.encode(JSON.stringify({
    aud: `tripflix-session:${location.origin}`,
    sub: purpose,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
  })));
  const content = `${header}.${payload}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key.privateKey, encoder.encode(content));
  return `${content}.${base64Url(new Uint8Array(signature))}`;
}
