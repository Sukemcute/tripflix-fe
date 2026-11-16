import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Chỉ người đã đăng nhập mới lưu xuống máy.
const CHAT_KEY = 'tripflix.assistantChat.v1';
export const ASSISTANT_STORAGE_MAX_BYTES = Platform.OS === 'web' ? undefined : 2048;
let pendingWrite = Promise.resolve();

export async function readStoredChat(): Promise<string | null> {
  await pendingWrite;
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CHAT_KEY) ?? null;
  return SecureStore.getItemAsync(CHAT_KEY);
}

export function writeStoredChat(value: string | null): Promise<void> {
  // Serialize writes so a slow SecureStore write cannot overwrite a later reset.
  const writing = pendingWrite.then(async () => {
    if (Platform.OS === 'web') {
      if (value === null) globalThis.localStorage?.removeItem(CHAT_KEY);
      else globalThis.localStorage?.setItem(CHAT_KEY, value);
      return;
    }
    if (value === null) await SecureStore.deleteItemAsync(CHAT_KEY);
    else await SecureStore.setItemAsync(CHAT_KEY, value);
  });
  pendingWrite = writing.catch(() => undefined);
  return writing;
}
