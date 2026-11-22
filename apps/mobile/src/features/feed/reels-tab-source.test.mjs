import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getReelsTabSource } from './reels-tab-source.ts';

test('Dành cho bạn của người đăng nhập đi qua discovery để chống lặp giữa các phiên', () => {
  assert.equal(getReelsTabSource('for_you', { isSignedIn: true }), 'recommended');
});

test('khách vẫn đọc feed vì discovery không chống lặp cho khách', () => {
  assert.equal(getReelsTabSource('for_you', { isSignedIn: false }), 'feed');
});

test('Đang hot luôn đọc feed (trend_scores), dù đã đăng nhập hay chưa', () => {
  assert.equal(getReelsTabSource('hot', { isSignedIn: true }), 'feed');
  assert.equal(getReelsTabSource('hot', { isSignedIn: false }), 'feed');
});
