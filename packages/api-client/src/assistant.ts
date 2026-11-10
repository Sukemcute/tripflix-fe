// Trợ lý Tripi (AI service POST /chat): trả SSE nên đọc bằng httpRaw thay vì hàm Orval sinh ra.
import type { ChatRequest } from './generated/ai-service/model';
import { HttpError, httpRaw } from './http';

export type AssistantAnswerKind = 'answer' | 'clarify' | 'refusal' | 'no_result' | 'fallback';

/** Thẻ gợi ý trong câu trả lời; khớp model Card của tripflix-ai (SSE nên không có trong OpenAPI). */
export interface AssistantCard {
  ref: string;
  id: string;
  kind: string;
  title: string;
  priceFrom: number | null;
  priceBasis:
    'indicative_per_night' | 'estimated_per_person' | 'per_night_per_room' | 'per_ticket' | 'unavailable';
  currency: 'VND';
  observedAt: string;
  checkIn?: string | null;
  checkOut?: string | null;
  totalPrice?: number | null;
  flightDate?: string | null;
  fromAirport?: string | null;
  toAirport?: string | null;
  passengers?: number | null;
  fareCode?: string | null;
}

export interface AssistantAnswer {
  kind: AssistantAnswerKind;
  text: string;
  cards: AssistantCard[];
}

/** Tách luồng SSE thành các sự kiện { event, data }; bỏ qua khối không có data. */
export function parseSseEvents(raw: string): { event: string; data: unknown }[] {
  return raw
    .replace(/\r\n/g, '\n')
    .split('\n\n')
    .flatMap((block) => {
      const lines = block.split('\n');
      const event =
        lines
          .find((line) => line.startsWith('event:'))
          ?.slice(6)
          .trim() ?? 'message';
      const data = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      return data ? [{ event, data: JSON.parse(data) as unknown }] : [];
    });
}

export async function sendAssistantMessage(
  request: ChatRequest,
  options: { baseUrl: string; signal?: AbortSignal },
): Promise<AssistantAnswer> {
  const res = await httpRaw('/chat', {
    method: 'POST',
    baseUrl: options.baseUrl,
    signal: options.signal,
    // AI không dùng cookie; gửi kèm cookie thì CORS bắt AI phải bật allow-credentials.
    credentials: 'omit',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(request),
  });
  // shortcut: đọc hết stream rồi mới hiện câu trả lời; khi AI stream chữ từng phần thì đọc dần qua res.body.
  const body = await res.text();
  if (!res.ok) throw new HttpError(res.status, body);
  const answer: AssistantAnswer = { kind: 'answer', text: '', cards: [] };
  for (const { event, data } of parseSseEvents(body)) {
    const payload = data as Record<string, unknown>;
    if (event === 'error') throw new HttpError(503, payload);
    if (event === 'text') answer.text += String(payload.delta ?? '');
    if (event === 'cards') answer.cards = (payload.items as AssistantCard[] | undefined) ?? [];
    if (event === 'done') answer.kind = payload.kind as AssistantAnswerKind;
  }
  if (!answer.text.trim()) throw new HttpError(502, 'Empty assistant answer');
  return answer;
}
