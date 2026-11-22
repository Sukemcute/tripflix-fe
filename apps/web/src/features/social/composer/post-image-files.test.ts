import { describe, expect, it } from 'vitest';
import { MAX_POST_IMAGE_BYTES, MAX_POST_IMAGES } from '@tripflix/api-client';
import { formatImageCount, moveItem, selectImageFiles } from './post-image-files';

const file = (name: string, type: string, size = 1024) => {
  const blob = new File(['x'], name, { type });
  Object.defineProperty(blob, 'size', { value: size });
  return blob;
};

describe('selectImageFiles', () => {
  it('nhận JPEG, PNG, WebP (theo loại hoặc đuôi file), giữ đúng thứ tự đã chọn', () => {
    const { accepted, messages } = selectImageFiles(
      [file('a.jpg', 'image/jpeg'), file('b.PNG', ''), file('c.webp', 'image/webp')],
      0,
    );
    expect(accepted.map((item) => [item.file.name, item.mimeType])).toEqual([
      ['a.jpg', 'image/jpeg'],
      ['b.PNG', 'image/png'],
      ['c.webp', 'image/webp'],
    ]);
    expect(messages).toEqual([]);
  });

  it('bỏ file sai loại và quá 10 MB, báo gộp theo lý do kèm tên file', () => {
    const { accepted, messages } = selectImageFiles(
      [
        file('dong.gif', 'image/gif'),
        file('iphone.heic', 'image/heic'),
        file('lon.jpg', 'image/jpeg', MAX_POST_IMAGE_BYTES + 1),
        file('ok.jpg', 'image/jpeg'),
      ],
      0,
    );
    expect(accepted.map((item) => item.file.name)).toEqual(['ok.jpg']);
    expect(messages).toEqual(['Chỉ nhận ảnh JPEG, PNG, WebP: dong.gif, iphone.heic', 'Ảnh lớn hơn 10 MB: lon.jpg']);
  });

  it(`không vượt ${MAX_POST_IMAGES} ảnh: bỏ ảnh chọn thêm từ cuối`, () => {
    const files = Array.from({ length: 4 }, (_, index) => file(`${index}.jpg`, 'image/jpeg'));
    const { accepted, messages } = selectImageFiles(files, MAX_POST_IMAGES - 2);
    expect(accepted.map((item) => item.file.name)).toEqual(['0.jpg', '1.jpg']);
    expect(messages).toEqual([`Mỗi bài viết tối đa ${MAX_POST_IMAGES} ảnh, đã bỏ bớt ảnh chọn thêm.`]);
  });
});

describe('moveItem', () => {
  it('đổi chỗ với ảnh kề bên; ở đầu hay cuối thì giữ nguyên', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a'], -1, 1)).toEqual(['a']);
  });
});

it('nhãn số ảnh', () => {
  expect(formatImageCount(3)).toBe(`3/${MAX_POST_IMAGES}`);
});
