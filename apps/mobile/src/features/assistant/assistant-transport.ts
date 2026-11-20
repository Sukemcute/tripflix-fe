import {
  AssistantError,
  HttpError,
  sendAssistantMessage,
  type AssistantAction,
  type AssistantTrip,
} from '@tripflix/api-client';
import type { Turn } from '@tripflix/api-client/ai-service/model/index';
import { buildAssistantHistory } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { Platform } from 'react-native';
import type { AssistantMessage, AssistantReply, AssistantTransport } from './assistant-provider';

const AI_BASE_URL =
  process.env.EXPO_PUBLIC_AI_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');
const copy = vi.assistant;

let conversationId = '';
// Hermes có thể thiếu crypto.randomUUID; mã cuộc trò chuyện không cần ngẫu nhiên an toàn.
const newConversationId = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 3) | 8).toString(16);
  });

export function resetAssistantConversationId(): void {
  conversationId = '';
}

export function getAssistantConversationId(): string {
  return conversationId;
}

/** AI từ chối lượt này: trả một tin của app thay cho lỗi chung, ô nhập vẫn dùng được. */
function refusedReply(error: unknown): AssistantReply | null {
  if (error instanceof AssistantError) {
    if (error.isLoginRequired) return { text: copy.guestLimit, isLocal: true, action: 'login' };
    if (error.code === 'TURN_IN_PROGRESS') return { text: copy.turnInProgress, isLocal: true };
    if (error.code === 'CHAT_BUSY') return { text: copy.busy, isLocal: true };
    if (error.code === 'RATE_LIMITED') return { text: copy.rateLimited, isLocal: true };
  }
  if (error instanceof HttpError && error.status === 401) {
    return { text: copy.loginRequired, isLocal: true, action: 'login' };
  }
  return null;
}

/** Nối khung chat Tripi với AI service (POST /chat); câu đầu tiên mở một cuộc trò chuyện mới. */
export const assistantTransport: AssistantTransport = async (messages, signal, context) => {
  const history = messages.slice(0, -1);
  const latest = messages.at(-1);
  if (!latest) throw new Error('No message to send');
  if (context.conversationId) {
    conversationId = context.conversationId;
  } else if (!history.length || !conversationId) {
    conversationId = newConversationId();
  }
  try {
    const answer = await sendAssistantMessage(
      {
        conversationId,
        message: latest.text,
        // kind chỉ là các giá trị server đã trả về ở lượt trước.
        history: buildAssistantHistory(history) as Turn[],
        contextPostId: context.contextPostId ?? null,
        action: context.action ?? null,
        trip: context.trip,
      },
      { baseUrl: AI_BASE_URL, signal },
    );
    return {
      text: answer.text,
      cards: answer.cards,
      kind: answer.kind,
      suggestions: answer.suggestions,
      trip: answer.trip,
    };
  } catch (error) {
    const reply = refusedReply(error);
    if (reply) return reply;
    throw error;
  }
};

/** Một cuộc trò chuyện riêng ngoài khung chat (ô lên lộ trình ở tab Đặt), không lẫn vào chat đang mở. */
export function newTripiConversationId(): string {
  return newConversationId();
}

/**
 * Gửi một lượt tới Tripi với lịch sử và lựa chọn do nơi gọi tự giữ (ô lên lộ trình ở tab Đặt).
 * Bị từ chối (hết lượt khách, đang bận…) thì trả câu của app thay cho lỗi.
 */
export async function askTripiTurn(turn: {
  conversationId: string;
  message: string;
  history: readonly AssistantMessage[];
  action?: AssistantAction;
  trip: AssistantTrip | null;
}): Promise<AssistantReply> {
  try {
    const answer = await sendAssistantMessage(
      {
        conversationId: turn.conversationId,
        message: turn.message,
        history: buildAssistantHistory(turn.history) as Turn[],
        contextPostId: null,
        action: turn.action ?? null,
        trip: turn.trip,
      },
      { baseUrl: AI_BASE_URL },
    );
    return {
      text: answer.text,
      cards: answer.cards,
      kind: answer.kind,
      suggestions: answer.suggestions,
      trip: answer.trip,
    };
  } catch (error) {
    const reply = refusedReply(error);
    if (reply) return reply;
    throw error;
  }
}
