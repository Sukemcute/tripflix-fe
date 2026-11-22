import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi as vitestVi } from 'vitest';
import * as apiClient from '@tripflix/api-client';
import {
  MentionPicker,
  handleMentionPickerKeyDown,
  resolveMentionPickerState,
} from './mention-picker';

afterEach(() => {
  vitestVi.restoreAllMocks();
});

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

  it('vẫn giữ và làm mờ nhẹ danh sách cũ khi đang tải từ khoá mới (isPlaceholderData)', () => {
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
      isFetching: true,
      isPlaceholderData: true,
      isError: false,
      error: null,
      isSearchable: true,
      refetch: vitestVi.fn(),
    } as unknown as ReturnType<typeof apiClient.useUserSearch>);

    const html = renderToStaticMarkup(
      <MentionPicker query="thanh xuan" onSelect={() => {}} onClose={() => {}} />,
    );
    expect(html).toContain('Huy Thành');
    expect(html).toContain('Tuấn Anh');
    expect(html).toContain('userListRefreshing');
    expect(html).not.toContain('Đang tìm người dùng…');
  });

  it('lỗi 429 hiển thị thông báo tìm hơi nhanh thay vì báo không tìm thấy', () => {
    vitestVi.spyOn(apiClient, 'useUserSearch').mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: true,
      error: new apiClient.HttpError(429, { message: 'Too many requests' }),
      isSearchable: true,
      refetch: vitestVi.fn(),
    } as unknown as ReturnType<typeof apiClient.useUserSearch>);

    const html = renderToStaticMarkup(
      <MentionPicker query="thanh" onSelect={() => {}} onClose={() => {}} />,
    );
    expect(html).toContain('Bạn tìm hơi nhanh, thử lại sau ít giây');
    expect(html).not.toContain('Không tìm thấy người dùng');
  });

  it('lỗi API khác hiển thị thông báo lỗi kèm nút thử lại', () => {
    vitestVi.spyOn(apiClient, 'useUserSearch').mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: true,
      error: new Error('HTTP 500'),
      isSearchable: true,
      refetch: vitestVi.fn(),
    } as unknown as ReturnType<typeof apiClient.useUserSearch>);

    const html = renderToStaticMarkup(
      <MentionPicker query="thanh" onSelect={() => {}} onClose={() => {}} />,
    );
    expect(html).toContain('Không tìm được, thử lại');
    expect(html).toContain('Thử lại');
    expect(html).not.toContain('Không tìm thấy người dùng');
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

  describe('resolveMentionPickerState khi chờ debounce 1 giây', () => {
    it('chưa có kết quả cũ mà đang chờ debounce thì hiện trạng thái đang tìm (kể cả khi query cũ rỗng hoặc lỗi)', () => {
      expect(
        resolveMentionPickerState({
          isSearchable: true,
          isDebouncing: true,
          hasUsers: false,
          isLoading: false,
          isFetching: false,
          isPlaceholderData: false,
          isError: false,
          isRateLimited: false,
        }),
      ).toEqual({ status: 'searching', isRefreshingExistingList: false });

      expect(
        resolveMentionPickerState({
          isSearchable: true,
          isDebouncing: true,
          hasUsers: false,
          isLoading: false,
          isFetching: false,
          isPlaceholderData: false,
          isError: true,
          isRateLimited: false,
        }),
      ).toEqual({ status: 'searching', isRefreshingExistingList: false });
    });

    it('đã có kết quả cũ mà đang chờ debounce thì giữ danh sách cũ làm mờ nhẹ', () => {
      expect(
        resolveMentionPickerState({
          isSearchable: true,
          isDebouncing: true,
          hasUsers: true,
          isLoading: false,
          isFetching: false,
          isPlaceholderData: false,
          isError: false,
          isRateLimited: false,
        }),
      ).toEqual({ status: 'list', isRefreshingExistingList: true });
    });
  });
});
