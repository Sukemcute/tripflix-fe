import { AssistantError, HttpError, sendAssistantMessage } from '@tripflix/api-client';
import type { Turn } from '@tripflix/api-client/ai-service/model/index';
import { buildAssistantHistory } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import type { AssistantReply, AssistantTransport } from './assistant-provider';

// Gateway mở AI ở <API>/ai/chat (deploy/traefik/server.yml), nên không cần thêm biến khi deploy.
const AI_BASE_URL =
  process.env.NEXT_PUBLIC_AI_URL || `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/ai`;
const copy = vi.assistant;

let conversationId = '';

/** AI từ chối lượt này: trả một tin của app thay cho lỗi chung, ô nhập vẫn dùng được. */
export function toRefusedReply(error: unknown): AssistantReply | null {
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
  if (!history.length || !conversationId) conversationId = crypto.randomUUID();
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
    const reply = toRefusedReply(error);
    if (reply) return reply;
    throw error;
  }
};
