import { getRandomValues } from 'expo-crypto';

/**
 * Hermes (Android, iOS) không có crypto.getRandomValues, mà mã hoá mật khẩu (TF056, @noble trong @tripflix/api-client)
 * cần nó để sinh khoá tạm và nonce. Lấy số ngẫu nhiên từ hệ điều hành qua expo-crypto. Trên web đã có sẵn thì giữ nguyên.
 */
const current = (globalThis as { crypto?: Partial<Crypto> }).crypto;
if (typeof current?.getRandomValues !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: { ...current, getRandomValues },
    configurable: true,
    writable: true,
  });
}
