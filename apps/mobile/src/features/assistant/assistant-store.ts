import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Chỉ người đã đăng nhập mới lưu xuống máy.
const CHAT_KEY = 'tripflix.assistantChat.v1';
// SecureStore giới hạn 2048 byte, không đủ cho thẻ lộ trình.
export const ASSISTANT_STORAGE_MAX_BYTES = Platform.OS === 'web' ? undefined : 64 * 1024;
let pendingWrite = Promise.resolve();
let hasReadLegacy = false;

export function readStoredChat(): Promise<string | null> {
  const reading = pendingWrite.then(async () => {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CHAT_KEY) ?? null;
    const file = new File(Paths.document, `${CHAT_KEY}.json`);
    if (file.exists) return file.text();
    if (hasReadLegacy) return null;
    const legacy = await SecureStore.getItemAsync(CHAT_KEY);
    if (legacy !== null) {
      file.create();
      await file.write(legacy);
    }
    await SecureStore.deleteItemAsync(CHAT_KEY);
    hasReadLegacy = true;
    return legacy;
  });
  // Việc chuyển kho cũ cũng phải chờ tuần tự để không ghi lại sau lệnh xoá chat.
  pendingWrite = reading.then(
    () => undefined,
    () => undefined,
  );
  return reading;
}

export function writeStoredChat(value: string | null): Promise<void> {
  // Ghi tuần tự để lần ghi chậm không ghi đè lệnh xoá chat mới hơn.
  const writing = pendingWrite.then(async () => {
    if (Platform.OS === 'web') {
      if (value === null) globalThis.localStorage?.removeItem(CHAT_KEY);
      else globalThis.localStorage?.setItem(CHAT_KEY, value);
      return;
    }
    const file = new File(Paths.document, `${CHAT_KEY}.json`);
    if (value === null) {
      if (file.exists) file.delete();
      await SecureStore.deleteItemAsync(CHAT_KEY);
    } else {
      if (!file.exists) file.create();
      await file.write(value);
      if (!hasReadLegacy) await SecureStore.deleteItemAsync(CHAT_KEY);
    }
    hasReadLegacy = true;
  });
  pendingWrite = writing.catch(() => undefined);
  return writing;
}
