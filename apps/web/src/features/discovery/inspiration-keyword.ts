export function validateInspirationKeyword(value: string | string[]) {
  if (Array.isArray(value)) return { keyword: '', error: 'searchPostsInvalidKeyword' } as const;

  const keyword = value.trim().replace(/\s+/gu, ' ').normalize('NFC');
  if (!keyword) return { keyword: '', error: 'searchPostsRequired' } as const;
  if (keyword.length < 2) return { keyword: '', error: 'searchPostsTooShort' } as const;
  if (keyword.length > 100) return { keyword: '', error: 'searchPostsTooLong' } as const;
  if (!/[\p{L}\p{N}]/u.test(keyword)) return { keyword: '', error: 'searchPostsInvalidKeyword' } as const;
  return { keyword, error: null };
}
