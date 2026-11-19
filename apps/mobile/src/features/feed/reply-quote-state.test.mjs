import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendReply, commentItems, shouldShowReplyQuote } from './reply-quote-state.ts';

const reply = (id, day) => ({ id, parentCommentId: 'root', createdAt: `2026-11-${day}T00:00:00Z` });
const pages = (...items) => ({ pages: items.map((items) => ({ items, total: 3, nextCursor: 'next' })), pageParams: [undefined, 'cursor'] });

test('only replies quoting another reply have a quote, including unavailable excerpts', () => {
  assert.equal(shouldShowReplyQuote({ parentCommentId: null, replyToCommentId: 'reply' }), false);
  assert.equal(shouldShowReplyQuote({ parentCommentId: 'root', replyToCommentId: null }), false);
  assert.equal(shouldShowReplyQuote({ parentCommentId: 'root', replyToCommentId: 'root' }), false);
  assert.equal(shouldShowReplyQuote({ parentCommentId: 'root', replyToCommentId: 'reply', replyToExcerpt: null }), true);
});

test('submission appends to last loaded page without changing cursors or existing items', () => {
  const data = pages([reply('a', 10)], [reply('b', 11)]);
  const updated = appendReply(data, reply('new', 19));
  assert.deepEqual(updated.pages.map((p) => p.items.map((r) => r.id)), [['a'], ['b', 'new']]);
  assert.deepEqual(updated.pageParams, data.pageParams);
  assert.deepEqual(updated.pages.map((p) => p.nextCursor), ['next', 'next']);
  assert.deepEqual(updated.pages.map((p) => p.total), [4, 4]);
  assert.equal(data.pages[1].items.length, 1);
  assert.equal(appendReply(updated, reply('new', 19)), updated);
  assert.equal(appendReply(undefined, reply('new', 19)), undefined);
});

test('later pages cannot duplicate or put older replies after the submitted reply', () => {
  const data = pages([reply('a', 10), reply('new', 19)], [reply('b', 11), reply('new', 19)]);
  assert.deepEqual(commentItems(data, true).map((r) => r.id), ['a', 'b', 'new']);
  assert.deepEqual(commentItems(data, false).map((r) => r.id), ['a', 'new', 'b']);
  assert.deepEqual(commentItems(undefined, true), []);
});
