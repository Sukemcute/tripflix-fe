// Trợ lý Tripi (AI service POST /chat): trả SSE nên đọc bằng httpRaw thay vì hàm Orval sinh ra.
import type { ChatRequest, DraftAction, TripContext } from './generated/ai-service/model';
import { HttpError, httpRaw } from './http';

export type AssistantAnswerKind = 'answer' | 'clarify' | 'refusal' | 'no_result' | 'fallback';
export type AssistantTrip = TripContext;

/** Một dòng của thẻ không có giá: ngày thời tiết, món nên mang, điểm trong lộ trình. */
export interface AssistantCardLine {
  label: string;
  detail?: string;
  /** Lựa chọn bấm được trên thẻ so sánh: gửi lại trong `action.ref`. */
  ref?: string | null;
}

/** Nút trên thẻ (Chọn, Bỏ điểm, Hoàn tác): AI chạy thẳng phép sửa, không gọi LLM. */
export type AssistantAction = DraftAction;

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
  lines?: AssistantCardLine[] | null;
  /** Nguồn phải ghi kèm thẻ, ví dụ "Open-Meteo.com". */
  source?: string | null;
}

export interface AssistantAnswer {
  kind: AssistantAnswerKind;
  text: string;
  cards: AssistantCard[];
  suggestions: string[];
  /** Những gì Tripi nhớ về chuyến đi; app gửi lại ở lượt sau. */
  trip: AssistantTrip | null;
  /** Phần chạy chế độ dự phòng ở lượt này, ví dụ ["llm"]. */
  degraded: string[];
}

/** AI từ chối lượt chat: 409 đang trả lời câu trước, 429 hết lượt, 503 đang đông. */
export class AssistantError extends HttpError {
  constructor(
    status: number,
    body: unknown,
    readonly code: string,
    readonly retryAfterSeconds: number,
    readonly isLoginRequired: boolean,
  ) {
    super(status, body);
    this.name = 'AssistantError';
  }
}

function toAssistantError(status: number, body: string): HttpError {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return new HttpError(status, body);
  }
  if (typeof parsed?.code !== 'string') return new HttpError(status, parsed);
  return new AssistantError(
    status,
    parsed,
    parsed.code,
    Number(parsed.retryAfterSeconds) || 0,
    parsed.loginRequired === true,
  );
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
  // shortcut: đọc hết stream rồi mới hiện câu trả lời; khi cần hiện chữ dần thì đọc qua res.body.
  const body = await res.text();
  if (!res.ok) throw toAssistantError(res.status, body);
  const answer: AssistantAnswer = {
    kind: 'answer',
    text: '',
    cards: [],
    suggestions: [],
    trip: null,
    degraded: [],
  };
  for (const { event, data } of parseSseEvents(body)) {
    const payload = data as Record<string, unknown>;
    if (event === 'error') throw new HttpError(503, payload);
    if (event === 'text') answer.text += String(payload.delta ?? '');
    if (event === 'cards') answer.cards = (payload.items as AssistantCard[] | undefined) ?? [];
    if (event === 'suggestions') answer.suggestions = (payload.items as string[] | undefined) ?? [];
    if (event === 'trip') answer.trip = payload as AssistantTrip;
    if (event === 'done') {
      answer.kind = payload.kind as AssistantAnswerKind;
      answer.degraded = (payload.degraded as string[] | undefined) ?? [];
    }
  }
  if (!answer.text.trim()) throw new HttpError(502, 'Empty assistant answer');
  return answer;
}
