import type { MessageKey } from '@tripflix/i18n';
import { AdminWorkspace } from './live-workspace';

// Keep the route contract; authorization now comes from the real API session.
export function PlaceholderPage({ label }: { label: MessageKey }) {
  return <AdminWorkspace label={label} />;
}
