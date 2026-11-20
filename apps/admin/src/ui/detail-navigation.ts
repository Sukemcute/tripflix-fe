export interface DetailNeighbors {
  /** Số thứ tự 1-based của hồ sơ trong danh sách đang hiển thị; 0 nếu hồ sơ không nằm trong danh sách. */
  position: number;
  total: number;
  previousId?: string;
  nextId?: string;
}

/** Hồ sơ liền trước/sau trong danh sách đang hiển thị (để bấm J/K hoặc nút mũi tên trong drawer). */
export function getNeighbors(ids: readonly string[], currentId: string): DetailNeighbors {
  const index = ids.indexOf(currentId);
  if (index === -1) return { position: 0, total: ids.length };
  return {
    position: index + 1,
    total: ids.length,
    previousId: index > 0 ? ids[index - 1] : undefined,
    nextId: index < ids.length - 1 ? ids[index + 1] : undefined,
  };
}
