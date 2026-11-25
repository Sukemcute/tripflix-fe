import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listPassengerGroups } from './passenger-groups.ts';

test('chỉ có người lớn thì chỉ một nhóm', () => {
  assert.deepEqual(listPassengerGroups({ adults: 2, children: 0, infants: 0 }), [
    { kind: 'adults', count: 2 },
  ]);
});

test('có trẻ em hoặc em bé thì thêm đúng nhóm đó', () => {
  assert.deepEqual(listPassengerGroups({ adults: 2, children: 1, infants: 0 }), [
    { kind: 'adults', count: 2 },
    { kind: 'children', count: 1 },
  ]);
  assert.deepEqual(listPassengerGroups({ adults: 1, children: 2, infants: 1 }), [
    { kind: 'adults', count: 1 },
    { kind: 'children', count: 2 },
    { kind: 'infants', count: 1 },
  ]);
});

test('người lớn vẫn hiện khi bằng 0 (màn đang chọn dở)', () => {
  assert.deepEqual(listPassengerGroups({ adults: 0, children: 0, infants: 0 }), [
    { kind: 'adults', count: 0 },
  ]);
});
