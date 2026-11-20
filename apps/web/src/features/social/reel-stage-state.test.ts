import { describe, expect, it } from 'vitest';
import { getReelStageState } from './reel-stage-state';

describe('getReelStageState', () => {
  const ready = { isSessionReady: true, isListPending: false, isSwitchingMode: false, hasError: false, hasPost: true };
  it('giữ khung chờ khi session, danh sách hoặc mode đang tải', () => {
    expect(getReelStageState({ ...ready, isSessionReady: false })).toBe('loading');
    expect(getReelStageState({ ...ready, isListPending: true })).toBe('loading');
    expect(getReelStageState({ ...ready, isSwitchingMode: true })).toBe('loading');
  });
  it('phân biệt lỗi, rỗng và có bài', () => {
    expect(getReelStageState({ ...ready, hasError: true })).toBe('error');
    expect(getReelStageState({ ...ready, hasPost: false })).toBe('empty');
    expect(getReelStageState(ready)).toBe('ready');
  });
});
