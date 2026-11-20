import { describe, expect, it } from 'vitest';
import { adminNav, canAccessNavItem, findNavItem, getVisibleNavGroups } from './nav';

// Danh sách trang moderator được xem trước khi tổ chức lại menu (MODERATOR_PAGES cũ). Không đổi nếu chưa có quyết định quyền.
const MODERATOR_ROUTES = [
  '/',
  '/moderation',
  '/alerts',
  '/audit',
  '/search-monitor',
  '/search-jobs',
  '/recommend-jobs',
];

const routesFor = (role: string) =>
  getVisibleNavGroups(role)
    .flatMap((group) => group.items)
    .map((item) => item.href);

describe('menu admin', () => {
  it('superadmin thấy đủ 14 route, không trùng', () => {
    const routes = routesFor('superadmin');
    expect(routes).toHaveLength(14);
    expect(new Set(routes).size).toBe(14);
  });

  it('moderator chỉ thấy đúng các trang đã có từ trước', () => {
    expect(routesFor('moderator').sort()).toEqual([...MODERATOR_ROUTES].sort());
  });

  it('vai trò khác không thấy trang nào', () => {
    expect(routesFor('member')).toEqual([]);
    expect(canAccessNavItem(undefined, adminNav[0]!)).toBe(false);
  });

  it('mỗi mục có icon riêng', () => {
    const icons = adminNav.map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('tìm mục theo nhãn và bỏ nhóm rỗng', () => {
    expect(findNavItem('admin.staff')?.href).toBe('/staff');
    const labels = getVisibleNavGroups('moderator').map((group) => group.id);
    expect(labels).not.toContain('commerce');
    expect(labels).not.toContain('people');
  });
});
