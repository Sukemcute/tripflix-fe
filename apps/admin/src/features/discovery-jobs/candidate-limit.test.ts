import { describe, expect, it } from 'vitest';
import { toCandidateLimit } from './candidate-limit';

const range = { min: 200, max: 5000 };

describe('toCandidateLimit', () => {
  it('nhận số nguyên trong khoảng, kể cả hai đầu', () => {
    expect(toCandidateLimit('200', range)).toBe(200);
    expect(toCandidateLimit('1000', range)).toBe(1000);
    expect(toCandidateLimit('5000', range)).toBe(5000);
  });

  it('từ chối rỗng, ngoài khoảng, số lẻ hoặc chữ', () => {
    expect(toCandidateLimit('', range)).toBeNull();
    expect(toCandidateLimit('199', range)).toBeNull();
    expect(toCandidateLimit('5001', range)).toBeNull();
    expect(toCandidateLimit('1500.5', range)).toBeNull();
    expect(toCandidateLimit('abc', range)).toBeNull();
  });
});
