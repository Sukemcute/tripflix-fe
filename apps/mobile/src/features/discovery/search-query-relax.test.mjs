import assert from 'node:assert/strict';
import { test } from 'node:test';
import { relaxBudgetQuery, relaxDaysQuery } from './search-query-relax.ts';

test('bỏ ngân sách "triệu" không để lại "iệu"', () => {
  assert.equal(relaxBudgetQuery('Đà Lạt 3 ngày dưới 3 triệu', 'Đà Lạt'), 'Đà Lạt 3 ngày');
});

test('bỏ các cách ghi ngân sách khác', () => {
  assert.equal(relaxBudgetQuery('Hội An tầm 2tr', 'Hội An'), 'Hội An');
  assert.equal(relaxBudgetQuery('Sa Pa khoảng 500k', 'Sa Pa'), 'Sa Pa');
  assert.equal(relaxBudgetQuery('Huế ngân sách 1,5 triệu', 'Huế'), 'Huế');
});

test('không xoá chữ bắt đầu giống đơn vị tiền', () => {
  assert.equal(relaxBudgetQuery('Đà Lạt 2 trekking', 'Đà Lạt'), 'Đà Lạt 2 trekking');
});

test('chỉ còn ngân sách thì lấy địa điểm, không có địa điểm thì giữ câu cũ', () => {
  assert.equal(relaxBudgetQuery('dưới 3 triệu', 'Đà Lạt'), 'Đà Lạt');
  assert.equal(relaxBudgetQuery('dưới 3 triệu'), 'dưới 3 triệu');
});

test('bỏ số ngày theo nhiều cách ghi', () => {
  assert.equal(relaxDaysQuery('Đà Lạt 3 ngày dưới 3 triệu', 'Đà Lạt'), 'Đà Lạt dưới 3 triệu');
  assert.equal(relaxDaysQuery('Hà Giang 3N2Đ', 'Hà Giang'), 'Hà Giang');
  assert.equal(relaxDaysQuery('Phú Quốc 2 đêm', 'Phú Quốc'), 'Phú Quốc');
});
