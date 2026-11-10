import { HttpError, sendAssistantMessage } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { Platform } from 'react-native';
import type { AssistantTransport } from './assistant-provider';

const AI_BASE_URL =
  process.env.EXPO_PUBLIC_AI_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

let conversationId = '';
// Hermes có thể thiếu crypto.randomUUID; mã cuộc trò chuyện không cần ngẫu nhiên an toàn.
const newConversationId = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 3) | 8).toString(16);
  });

/** Nối khung chat Tripi với AI service (POST /chat); câu đầu tiên mở một cuộc trò chuyện mới. */
export const assistantTransport: AssistantTransport = async (messages, signal) => {
  const history = messages.slice(0, -1);
  const latest = messages.at(-1);
  if (!latest) throw new Error('No message to send');
  if (!history.length || !conversationId) conversationId = newConversationId();
  const answer = await sendAssistantMessage(
    {
      conversationId,
      message: latest.text,
      history: history.slice(-10).map((turn) => ({ role: turn.role, text: turn.text.slice(0, 2000) })),
    },
    { baseUrl: AI_BASE_URL, signal },
  ).catch((error: unknown) => {
    // AI chỉ trả lời người đã đăng nhập; báo rõ thay cho lỗi chung "Chưa gửi được tin nhắn".
    if (error instanceof HttpError && error.status === 401) return null;
    throw error;
  });
  if (!answer) return vi.assistant.loginRequired;
  return { text: answer.text, cards: answer.cards };
};
