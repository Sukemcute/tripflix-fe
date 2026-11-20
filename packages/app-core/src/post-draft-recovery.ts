import type { TripPlanDraft } from './trip-plan';

export interface PostDraftVideo {
  uri: string;
  durationMs: number;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
}

export interface PostDraftContent {
  title: string;
  body: string;
  hashtags: string;
  visibility: 'public' | 'private';
  hasTripPlan: boolean;
  tripDraft: TripPlanDraft;
  video: PostDraftVideo | null;
}

export interface PostDraftRecovery {
  version: 1;
  userId: string;
  editorKey: string;
  postId: string | null;
  savedAt: number;
  content: PostDraftContent;
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const nullableString = (value: unknown) => value === null || typeof value === 'string';

/** Validate device storage before it reaches inputs or itinerary editors. */
export function parsePostDraftRecovery(
  raw: string | null,
  userId: string,
  editorKey: string,
): PostDraftRecovery | null {
  if (!raw || raw.length > 1_000_000) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    if (
      !record(saved) ||
      saved.version !== 1 ||
      saved.userId !== userId ||
      saved.editorKey !== editorKey ||
      (editorKey !== 'new' && saved.postId !== editorKey) ||
      !nullableString(saved.postId) ||
      typeof saved.savedAt !== 'number' ||
      !Number.isFinite(saved.savedAt) ||
      !record(saved.content)
    )
      return null;
    const content = saved.content;
    if (
      !['title', 'body', 'hashtags'].every((key) => typeof content[key] === 'string') ||
      !['public', 'private'].includes(String(content.visibility)) ||
      typeof content.hasTripPlan !== 'boolean'
    )
      return null;
    const trip = content.tripDraft;
    if (
      !record(trip) ||
      typeof trip.destinationName !== 'string' ||
      typeof trip.destinationPlaceId !== 'string' ||
      !nullableString(trip.posterMediaId) ||
      !nullableString(trip.bookingId) ||
      (trip.estimatedCostPerPerson != null &&
        (typeof trip.estimatedCostPerPerson !== 'number' || !Number.isFinite(trip.estimatedCostPerPerson))) ||
      (trip.preserved !== undefined &&
        (!record(trip.preserved) ||
          !Object.values(trip.preserved).every((value) => typeof value === 'string'))) ||
      !Array.isArray(trip.days) ||
      trip.days.length < 1 ||
      trip.days.length > 30
    )
      return null;
    for (const day of trip.days) {
      if (!record(day) || !Array.isArray(day.points) || day.points.length > 1000) return null;
      for (const point of day.points) {
        if (
          !record(point) ||
          ![
            'key',
            'hotelId',
            'productId',
            'ratePlanCode',
            'roomName',
            'time',
            'title',
            'location',
            'fromCode',
            'toCode',
            'note',
          ].every((key) => typeof point[key] === 'string') ||
          !['activity', 'hotel'].includes(String(point.kind)) ||
          ![null, 'flight', 'bus', 'train', 'car', 'other'].includes(point.mode as string | null) ||
          ![null, 'cafe', 'food', 'fun', 'other'].includes(point.category as string | null)
        )
          return null;
      }
    }
    const video = content.video;
    if (
      video !== null &&
      (!record(video) ||
        typeof video.uri !== 'string' ||
        !video.uri ||
        !['video/mp4', 'video/quicktime'].includes(String(video.mimeType)) ||
        !['durationMs', 'width', 'height', 'sizeBytes'].every(
          (key) => typeof video[key] === 'number' && Number.isFinite(video[key]) && video[key] >= 0,
        ) ||
        !(Number(video.durationMs) > 0) ||
        !(Number(video.sizeBytes) > 0))
    )
      return null;
    return saved as unknown as PostDraftRecovery;
  } catch {
    return null;
  }
}
