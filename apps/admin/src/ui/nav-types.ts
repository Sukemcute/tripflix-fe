import type { MessageKey } from '@tripflix/i18n';
import type { AdminIconName } from './icons';

export interface AdminNavItem {
  readonly href: string;
  readonly label: MessageKey;
  readonly icon: AdminIconName;
  readonly description: string;
  /** Vai trò thấp nhất được thấy mục này; superadmin thấy tất cả. */
  readonly minRole: 'moderator' | 'superadmin';
}

export interface AdminNavGroup {
  readonly id: 'overview' | 'content' | 'commerce' | 'people' | 'system';
  /** Nhóm không có nhãn thì hiển thị mục ở đầu menu, không thu gọn được. */
  readonly label?: string;
  readonly items: readonly AdminNavItem[];
}
