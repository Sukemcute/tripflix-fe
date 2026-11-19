import { describe, expect, it, vi } from 'vitest';

// Hook chạy không cần React DOM: useEffect chạy ngay, useRef giữ giá trị theo thứ tự gọi trong một "lần mount".
let refs: Array<{ current: unknown }> = [];
let refIndex = 0;
vi.mock('react', () => ({
  useRef: (initial: unknown) => (refs[refIndex++] ??= { current: initial }),
  useEffect: (fn: () => void) => fn(),
}));
const client = { getQueryData: vi.fn(), resetQueries: vi.fn() };
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => client }));

const { useResetOnReturn } = await import('./reset-on-return');
const mount = () => {
  refs = [];
};
const render = (key: unknown[], isActive: boolean) => {
  refIndex = 0;
  useResetOnReturn(key, isActive);
};

describe('useResetOnReturn', () => {
  it('quay lại trang mà đã có cache: tải lại từ đầu, chỉ một lần mỗi lần mount', () => {
    client.getQueryData.mockReturnValue({ pages: [] });
    client.resetQueries.mockClear();
    mount();
    render(['feed', 'recommended', 'for_you'], true);
    render(['feed', 'recommended', 'trending'], true); // đổi chip trong trang: không tải lại
    expect(client.resetQueries).toHaveBeenCalledTimes(1);
    expect(client.resetQueries).toHaveBeenCalledWith({ queryKey: ['feed', 'recommended', 'for_you'], exact: true });
  });

  it('tab được giữ mount (Bài viết): mỗi lần ẩn rồi hiện lại thì tải lại', () => {
    client.getQueryData.mockReturnValue({ pages: [] });
    client.resetQueries.mockClear();
    mount();
    render(['social', 'public'], true);
    render(['social', 'public'], false);
    render(['social', 'public'], true);
    render(['social', 'public'], true);
    expect(client.resetQueries).toHaveBeenCalledTimes(2);
  });

  it('lần đầu vào trang (chưa có cache) hoặc chưa sẵn sàng: không làm gì thêm', () => {
    client.resetQueries.mockClear();
    client.getQueryData.mockReturnValue(undefined);
    mount();
    render(['k'], true);
    mount();
    render(['k'], false);
    expect(client.resetQueries).not.toHaveBeenCalled();
  });
});
