import { vi } from '@tripflix/i18n';
import type { Tone } from '../ui/primitives';

export const POST_STATUS_TONE: Record<string, Tone> = {
  draft: 'neutral',
  published: 'teal',
  held: 'sun',
  hidden: 'coral',
  removed: 'danger',
  deleted: 'neutral',
};

export function postStatusLabel(status: string): string {
  if (status === 'held') return vi.api.moderationHeld;
  const label = (vi.api as Record<string, unknown>)[status];
  return typeof label === 'string' ? label : status;
}
