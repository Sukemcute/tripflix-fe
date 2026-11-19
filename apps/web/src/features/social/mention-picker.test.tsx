import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi as vitestVi } from 'vitest';
import * as apiClient from '@tripflix/api-client';
import { MentionPicker, handleMentionPickerKeyDown } from './mention-picker';

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

  describe('handleMentionPickerKeyDown (Tab / Enter / Esc)', () => {
    const users = [
      { id: 'u1', displayName: 'Huy Thành' },
      { id: 'u2', displayName: 'Tuấn Anh' },
    ];

    it('bấm Tab khi có người đang chọn sẽ chèn tag giống Enter và chặn chuyển focus', () => {
      const onSelect = vitestVi.fn();
      const onClose = vitestVi.fn();
      const updateActiveIndex = vitestVi.fn();
      const preventDefault = vitestVi.fn();
      const stopPropagation = vitestVi.fn();

      const handled = handleMentionPickerKeyDown(
        { key: 'Tab', shiftKey: false, isComposing: false, preventDefault, stopPropagation },
        { users, activeIndex: 1, onSelect, onClose, updateActiveIndex },
      );

      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(stopPropagation).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith({ id: 'u2', displayName: 'Tuấn Anh' });
    });

    it('bấm Enter chèn đúng người đang có vệt chọn', () => {
      const onSelect = vitestVi.fn();
      const preventDefault = vitestVi.fn();
      const stopPropagation = vitestVi.fn();

      const handled = handleMentionPickerKeyDown(
        { key: 'Enter', shiftKey: false, isComposing: false, preventDefault, stopPropagation },
        { users, activeIndex: 0, onSelect, onClose: vitestVi.fn(), updateActiveIndex: vitestVi.fn() },
      );

      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith({ id: 'u1', displayName: 'Huy Thành' });
    });

    it('khi danh sách rỗng hoặc bấm Shift+Tab thì không chặn Tab để chuyển focus bình thường', () => {
      const onSelect = vitestVi.fn();
      const preventDefaultEmpty = vitestVi.fn();
      const handledEmpty = handleMentionPickerKeyDown(
        {
          key: 'Tab',
          shiftKey: false,
          isComposing: false,
          preventDefault: preventDefaultEmpty,
          stopPropagation: vitestVi.fn(),
        },
        { users: [], activeIndex: 0, onSelect, onClose: vitestVi.fn(), updateActiveIndex: vitestVi.fn() },
      );

      expect(handledEmpty).toBe(false);
      expect(preventDefaultEmpty).not.toHaveBeenCalled();

      const preventDefaultShift = vitestVi.fn();
      const handledShiftTab = handleMentionPickerKeyDown(
        {
          key: 'Tab',
          shiftKey: true,
          isComposing: false,
          preventDefault: preventDefaultShift,
          stopPropagation: vitestVi.fn(),
        },
        { users, activeIndex: 0, onSelect, onClose: vitestVi.fn(), updateActiveIndex: vitestVi.fn() },
      );

      expect(handledShiftTab).toBe(false);
      expect(preventDefaultShift).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
