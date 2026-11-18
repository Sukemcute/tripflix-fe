// Chỉ người đã đăng nhập mới lưu; cùng khoá với bản web của app mobile.
const CHAT_KEY = 'tripflix.assistantChat.v1';

export function readStoredChat(): string | null {
  return globalThis.localStorage?.getItem(CHAT_KEY) ?? null;
}

export function writeStoredChat(value: string | null): void {
  if (value === null) globalThis.localStorage?.removeItem(CHAT_KEY);
  else globalThis.localStorage?.setItem(CHAT_KEY, value);
}
