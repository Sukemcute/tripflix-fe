import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Chỉ người đã đăng nhập mới lưu xuống máy; cách lưu giống giỏ hàng (features/booking/cart-store.ts).
// shortcut: mỗi lần lưu ghi lại cả phiên (≤ 20 tin); khi phiên to hơn vài KB thì chuyển sang lưu theo lượt.
const CHAT_KEY = 'tripflix.assistantChat.v1';

export async function readStoredChat(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CHAT_KEY) ?? null;
  return SecureStore.getItemAsync(CHAT_KEY);
}

export async function writeStoredChat(value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value === null) globalThis.localStorage?.removeItem(CHAT_KEY);
    else globalThis.localStorage?.setItem(CHAT_KEY, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(CHAT_KEY);
  else await SecureStore.setItemAsync(CHAT_KEY, value);
}
