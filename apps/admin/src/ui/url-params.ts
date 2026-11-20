export type ParamPatch = Record<string, string | null | undefined>;

/** Gộp thay đổi vào chuỗi query: giá trị rỗng/null/undefined thì xoá khoá. Giữ nguyên các khoá không đụng tới. */
export function applyParamPatch(search: string, patch: ParamPatch): string {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  }
  return params.toString();
}

/** Giá trị query chỉ hợp lệ khi nằm trong danh sách cho phép; sai thì dùng giá trị mặc định (không tin URL do người dùng gõ). */
export function readEnumParam<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Số trang từ query: số nguyên ≥ 1, sai thì về 1. */
export function readPageParam(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}
