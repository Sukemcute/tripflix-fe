import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getExploreHotelQuery } from './explore-query-param.ts';

test('lấy địa điểm từ tham số q', () => {
  assert.equal(getExploreHotelQuery('Đà Lạt'), 'Đà Lạt');
});

test('bỏ khoảng trắng thừa', () => {
  assert.equal(getExploreHotelQuery('  Nha Trang '), 'Nha Trang');
});

test('tham số lặp lại thì lấy giá trị đầu', () => {
  assert.equal(getExploreHotelQuery(['Hội An', 'Huế']), 'Hội An');
});

test('không có hoặc rỗng thì không mở kết quả khách sạn', () => {
  assert.equal(getExploreHotelQuery(undefined), '');
  assert.equal(getExploreHotelQuery(''), '');
  assert.equal(getExploreHotelQuery('   '), '');
  assert.equal(getExploreHotelQuery([]), '');
});
