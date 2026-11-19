import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi as vitestVi } from 'vitest';
import * as apiClient from '@tripflix/api-client';
import { MentionPicker } from './mention-picker';

describe('MentionPicker', () => {
  it('hiện gợi ý gõ ít nhất 2 ký tự khi query quá ngắn', () => {
    vitestVi.spyOn(apiClient, 'useUserSearch').mockReturnValue({
      data: undefined,
      isLoading: false,
      isSearchable: false,
    } as unknown as ReturnType<typeof apiClient.useUserSearch>);

    const html = renderToStaticMarkup(
      <MentionPicker query="a" onSelect={() => {}} onClose={() => {}} />,
    );
    expect(html).toContain('Gõ ít nhất 2 ký tự để tìm kiếm');
    expect(html).toContain('Nhắc đến người dùng');
  });

  it('hiện trạng thái đang tìm kiếm khi query đủ dài', () => {
    vitestVi.spyOn(apiClient, 'useUserSearch').mockReturnValue({
      data: undefined,
      isLoading: true,
      isSearchable: true,
    } as unknown as ReturnType<typeof apiClient.useUserSearch>);

    const html = renderToStaticMarkup(
      <MentionPicker query="thanh" onSelect={() => {}} onClose={() => {}} />,
    );
    expect(html).toContain('Đang tìm người dùng…');
  });

  it('hiện thông báo không tìm thấy khi danh sách kết quả rỗng', () => {
    vitestVi.spyOn(apiClient, 'useUserSearch').mockReturnValue({
      data: { items: [], page: 1, hasMore: false },
      isLoading: false,
      isSearchable: true,
    } as unknown as ReturnType<typeof apiClient.useUserSearch>);

    const html = renderToStaticMarkup(
      <MentionPicker query="nguoi_la" onSelect={() => {}} onClose={() => {}} />,
    );
    expect(html).toContain('Không tìm thấy người dùng');
  });

  it('hiển thị danh sách người dùng tìm được', () => {
    vitestVi.spyOn(apiClient, 'useUserSearch').mockReturnValue({
      data: {
        items: [
          { id: 'u1', displayName: 'Huy Thành' },
          { id: 'u2', displayName: 'Tuấn Anh' },
        ],
        page: 1,
        hasMore: false,
      },
      isLoading: false,
      isSearchable: true,
    } as unknown as ReturnType<typeof apiClient.useUserSearch>);

    const html = renderToStaticMarkup(
      <MentionPicker query="thanh" onSelect={() => {}} onClose={() => {}} />,
    );
    expect(html).toContain('Huy Thành');
    expect(html).toContain('Tuấn Anh');
    expect(html).toContain('data-tone=');
  });
});
