const DESTINATION_COVERS = new Map([
  ['nha trang', '/brand/sea.jpg'],
  ['khánh hòa', '/brand/sea.jpg'],
  ['nhatrang', '/brand/sea.jpg'],
  ['hội an', '/brand/hoian.jpg'],
  ['hoian', '/brand/hoian.jpg'],
  ['phố cổ', '/brand/hoian.jpg'],
  ['đà nẵng', '/brand/home-shore.jpg'],
  ['danang', '/brand/home-shore.jpg'],
  ['hà giang', '/brand/home-kayaking.jpg'],
  ['hagiang', '/brand/home-kayaking.jpg'],
  ['mã pí lèng', '/brand/home-kayaking.jpg'],
  ['mapileng', '/brand/home-kayaking.jpg'],
  ['đồng văn', '/brand/home-kayaking.jpg'],
  ['hạ long', '/brand/home-kayak-source.jpg'],
  ['halong', '/brand/home-kayak-source.jpg'],
  ['ninh bình', '/brand/home-kayaking.jpg'],
  ['ninhbinh', '/brand/home-kayaking.jpg'],
  ['tràng an', '/brand/home-kayaking.jpg'],
  ['sa pa', '/brand/home-surf.jpg'],
  ['sapa', '/brand/home-surf.jpg'],
  ['fansipan', '/brand/home-surf.jpg'],
  ['phú quốc', '/brand/beach.jpg'],
  ['phuquoc', '/brand/beach.jpg'],
  ['đà lạt', '/brand/home-surf.jpg'],
  ['dalat', '/brand/home-surf.jpg'],
]);

const KEYWORD_IMAGE_POOL: readonly {
  keywords: readonly string[];
  src: string;
  focalPoint: string;
}[] = [
  {
    keywords: ['hội an', 'hoian', 'phố cổ', 'phoco', 'hoa đăng', 'sông hoài', 'grand world'],
    src: '/brand/hoian.jpg',
    focalPoint: 'center 32%',
  },
  {
    keywords: ['hội an', 'hoian', 'đèn lồng', 'chợ đêm', 'làng gốm', 'rừng dừa', 'phố đi bộ', 'ẩm thực', 'hải sản'],
    src: '/brand/home-hoi-an-lanterns.jpg',
    focalPoint: 'center 28%',
  },
  {
    keywords: ['nha trang', 'nhatrang', 'vịnh san hô', 'hòn tre', 'hòn mun', 'hòn tằm', 'biển xanh'],
    src: '/brand/sea.jpg',
    focalPoint: 'center 36%',
  },
  {
    keywords: ['phú quốc', 'phuquoc', 'bãi trường', 'an thới', 'gầm ghì', 'móng tay', 'đảo ngọc', 'sunset', 'hoàng hôn'],
    src: '/brand/beach.jpg',
    focalPoint: 'center 35%',
  },
  {
    keywords: ['đà nẵng', 'danang', 'mỹ khê', 'mykhe', 'sơn trà', 'cầu rồng', 'biển', 'vịnh'],
    src: '/brand/home-shore.jpg',
    focalPoint: 'center 38%',
  },
  {
    keywords: ['hạ long', 'halong', 'tràng an', 'ninh bình', 'ninhbinh', 'hà giang', 'cano', 'thuyền', 'suối', 'ba hồ'],
    src: '/brand/home-kayaking.jpg',
    focalPoint: 'center 34%',
  },
  {
    keywords: ['đảo rều', 'daoreu', 'hang sửng sốt', 'ti tốp', 'du thuyền', 'lặn', 'san hô', 'tour 3 đảo', 'tour 4 đảo'],
    src: '/brand/home-kayak-source.jpg',
    focalPoint: 'center 35%',
  },
  {
    keywords: ['đà lạt', 'dalat', 'săn mây', 'cầu đất', 'sa pa', 'sapa', 'fansipan', 'rừng thông', 'đồi', 'trekking', 'cáp treo'],
    src: '/brand/home-surf.jpg',
    focalPoint: 'center 30%',
  },
  {
    keywords: ['vinpearl', 'hotel', 'resort', 'palace', 'coupole', 'emeralda', 'check-in', 'nghỉ dưỡng', 'buffet'],
    src: '/brand/hotel.jpg',
    focalPoint: 'center 38%',
  },
];

export interface PostImageItem {
  src: string;
  focalPoint: string;
}

export const POST_COVER_MASCOT = '/brand/tripi-curious.png';

export function getPostCover(destinationName?: string, title?: string, hashtags?: readonly string[]) {
  const normalizedDest = destinationName?.trim().toLowerCase() ?? '';
  if (normalizedDest) {
    const exact = DESTINATION_COVERS.get(normalizedDest);
    if (exact) return exact;
  }

  const haystacks = [
    normalizedDest,
    title?.trim().toLowerCase() ?? '',
    ...(hashtags?.map((tag) => tag.trim().toLowerCase()) ?? []),
  ].filter(Boolean);

  for (const text of haystacks) {
    for (const [key, cover] of DESTINATION_COVERS.entries()) {
      if (text.includes(key)) return cover;
    }
  }
  return undefined;
}

/**
 * Tổng hợp danh sách ảnh hợp lệ (không trùng lặp) của một bài đăng dựa trên dữ liệu thực tế:
 * mediaIds (nếu là URL), poster từ feed, điểm đến, khách sạn, hashtag và các điểm dừng lịch trình.
 */
export function getPostImages(options: {
  mediaIds?: readonly string[];
  posterUrl?: string;
  destinationName?: string;
  hotelName?: string;
  title?: string;
  body?: string;
  hashtags?: readonly string[];
  itineraryItems?: readonly { title?: string; location?: string; notes?: string }[];
}): PostImageItem[] {
  const seen = new Set<string>();
  const result: PostImageItem[] = [];

  const pushUnique = (src: string | undefined, focalPoint = 'center 35%') => {
    const clean = src?.trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    result.push({ src: clean, focalPoint });
  };

  // 1. Nếu mediaIds chứa đường dẫn ảnh trực tiếp (URL hoặc path nội bộ)
  for (const mediaId of options.mediaIds ?? []) {
    if (
      (mediaId.startsWith('/') || mediaId.startsWith('http://') || mediaId.startsWith('https://')) &&
      !/\.m3u8(\?|$)/i.test(mediaId) &&
      !/\.mp4(\?|$)/i.test(mediaId)
    ) {
      pushUnique(mediaId, 'center 35%');
    }
  }

  // 2. Ảnh bìa theo điểm đến chính
  const primaryCover = getPostCover(options.destinationName, options.title, options.hashtags);
  if (primaryCover) {
    pushUnique(primaryCover, 'center 35%');
  }

  // 3. Poster thực tế từ CloudFront (nếu có)
  if (options.posterUrl) {
    pushUnique(options.posterUrl, 'center 30%');
  }

  // 4. Quét theo các điểm dừng trong lịch trình, tên khách sạn, nội dung và hashtag
  const stopTexts = (options.itineraryItems ?? []).map((item) =>
    [item.title, item.location, item.notes].filter(Boolean).join(' ').toLowerCase(),
  );

  // Mỗi điểm dừng lịch trình khớp với ảnh thực tế sẽ đóng góp vào bộ ảnh của chuyến đi
  for (const stopText of stopTexts) {
    for (const entry of KEYWORD_IMAGE_POOL) {
      if (entry.keywords.some((kw) => stopText.includes(kw))) {
        pushUnique(entry.src, entry.focalPoint);
      }
    }
  }

  // Quét thêm trên tiêu đề, tên khách sạn, nội dung và hashtag của bài viết
  const metaText = [
    options.destinationName,
    options.hotelName,
    options.title,
    options.body,
    ...(options.hashtags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const entry of KEYWORD_IMAGE_POOL) {
    if (entry.keywords.some((kw) => metaText.includes(kw))) {
      pushUnique(entry.src, entry.focalPoint);
    }
  }

  return result;
}

