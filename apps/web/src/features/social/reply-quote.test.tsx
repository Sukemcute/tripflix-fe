import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReplyQuote, scrollToQuotedComment, shouldShowReplyQuote } from './reply-quote';

const here = dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  vi.useRealTimers();
});

describe('shouldShowReplyQuote', () => {
  it('chỉ bật khung trích dẫn khi reply trả lời vào một reply khác trong luồng', () => {
    expect(
      shouldShowReplyQuote({
        isReply: true,
        parentCommentId: 'c-root',
        replyToCommentId: 'c-reply-b',
      }),
    ).toBe(true);
  });

  it('ẩn khung trích dẫn khi trả lời thẳng bình luận gốc hoặc bình luận gốc tự nó', () => {
    expect(
      shouldShowReplyQuote({
        isReply: true,
        parentCommentId: 'c-root',
        replyToCommentId: 'c-root',
      }),
    ).toBe(false);

    expect(
      shouldShowReplyQuote({
        isReply: false,
        parentCommentId: 'c-root',
        replyToCommentId: 'c-reply-b',
      }),
    ).toBe(false);

    expect(
      shouldShowReplyQuote({
        isReply: true,
        parentCommentId: 'c-root',
        replyToCommentId: null,
      }),
    ).toBe(false);
  });
});

describe('ReplyQuote', () => {
  it('render nút bấm được với tiêu đề "Trả lời {Tên}" và trích đoạn khi bình luận đích còn hiển thị', () => {
    const html = renderToStaticMarkup(
      <ReplyQuote
        replyToCommentId="c-reply-b"
        replyToName="Minh An"
        replyToExcerpt="Quán này mở tới mấy giờ vậy bạn?"
      />,
    );

    expect(html).toContain('<button type="button"');
    expect(html).toContain('Trả lời Minh An');
    expect(html).toContain('Quán này mở tới mấy giờ vậy bạn?');
    expect(html).not.toContain('Bình luận không còn hiển thị');
  });

  it('render khung không bấm được với thông báo không còn hiển thị khi replyToExcerpt là null', () => {
    const html = renderToStaticMarkup(
      <ReplyQuote
        replyToCommentId="c-reply-b"
        replyToName="Minh An"
        replyToExcerpt={null}
      />,
    );

    expect(html).not.toContain('<button');
    expect(html).toContain('<div');
    expect(html).toContain('Trả lời Minh An');
    expect(html).toContain('Bình luận không còn hiển thị');
  });

  it('dùng tên dự phòng khi thiếu replyToName', () => {
    const html = renderToStaticMarkup(
      <ReplyQuote
        replyToCommentId="c-reply-b"
        replyToName={null}
        replyToExcerpt="Hẹn bạn cuối tuần ở Đà Lạt nha"
      />,
    );

    expect(html).toContain('Trả lời Thành viên');
  });
});

describe('scrollToQuotedComment', () => {
  it('chỉ cuộn bên trong scrollContainer của panel bình luận và tô sáng rồi tắt sau 1,5 giây', () => {
    vi.useFakeTimers();
    const attrs = new Map<string, string>();
    const target = {
      clientHeight: 80,
      getBoundingClientRect: () => ({ top: 450 }),
      setAttribute: (name: string, value: string) => attrs.set(name, value),
      removeAttribute: (name: string) => attrs.delete(name),
    } as unknown as HTMLElement;

    const scrollTo = vi.fn();
    const querySelector = vi.fn(() => target);
    const scrollContainer = {
      scrollHeight: 900,
      clientHeight: 300,
      scrollTop: 100,
      getBoundingClientRect: () => ({ top: 50 }),
      scrollTo,
      querySelector,
    } as unknown as HTMLElement;

    const scrolled = scrollToQuotedComment(scrollContainer, 'c-reply-b');

    expect(scrolled).toBe(true);
    expect(querySelector).toHaveBeenCalledWith('[data-comment-id="c-reply-b"]');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 390, behavior: 'smooth' });
    expect(attrs.get('data-quote-highlighted')).toBe('true');

    vi.advanceTimersByTime(1_499);
    expect(attrs.get('data-quote-highlighted')).toBe('true');

    vi.advanceTimersByTime(1);
    expect(attrs.has('data-quote-highlighted')).toBe(false);
  });

  it('không làm gì và trả về false nếu bình luận đích chưa nằm trong DOM panel', () => {
    const scrollTo = vi.fn();
    const scrollContainer = {
      scrollHeight: 900,
      clientHeight: 300,
      scrollTop: 0,
      scrollTo,
      querySelector: vi.fn(() => null),
    } as unknown as HTMLElement;

    expect(scrollToQuotedComment(scrollContainer, 'chua-tai')).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollToQuotedComment(null, 'c-reply-b')).toBe(false);
  });
});

describe('tích hợp ReplyQuote trong live-posts.tsx', () => {
  it('bỏ tiền tố "↳ Tên" trên dòng tác giả và gắn ReplyQuote + data-comment-id', () => {
    const source = readFileSync(resolve(here, 'live-posts.tsx'), 'utf8');

    expect(source).not.toContain('comment.replyToName &&');
    expect(source).toContain('shouldShowReplyQuote');
    expect(source).toContain('<ReplyQuote');
    expect(source).toContain('scrollToQuotedComment');
    expect(source).toContain('data-comment-id={comment.id}');
  });

  it('CSS khung trích dẫn và cột bình luận có min-width: 0 và cắt ba chấm khi chữ dài', () => {
    const quoteCss = readFileSync(resolve(here, 'reply-quote.module.css'), 'utf8');
    const postsCss = readFileSync(resolve(here, 'live-posts.module.css'), 'utf8');

    const quoteCardBlock = quoteCss.match(/\.quoteCard\s*\{[^}]*\}/)?.[0] ?? '';
    expect(quoteCardBlock).toContain('min-width: 0');
    expect(quoteCardBlock).toContain('max-width: 100%');
    expect(quoteCardBlock).toContain('box-sizing: border-box');
    expect(quoteCardBlock).toContain('overflow: hidden');

    for (const selector of ['quoteTitle', 'quoteExcerpt']) {
      const block = quoteCss.match(new RegExp(`\\.${selector}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(block).toContain('min-width: 0');
      expect(block).toContain('white-space: nowrap');
      expect(block).toContain('overflow: hidden');
      expect(block).toContain('text-overflow: ellipsis');
    }

    for (const selector of [
      'panelCommentList',
      'panelCommentItem',
      'panelCommentRow',
      'panelCommentContent',
      'panelReplyWrapper',
    ]) {
      const block = postsCss.match(new RegExp(`\\.${selector}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(block).toContain('min-width: 0');
    }
  });
});
