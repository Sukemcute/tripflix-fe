/** Trả null khi không phải số nguyên nằm trong khoảng BE nhận cho PUT /admin/discovery/jobs/candidate-limit. */
export function toCandidateLimit(value: string, range: { min: number; max: number }): number | null {
  if (value.trim() === '') return null;
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= range.min && limit <= range.max ? limit : null;
}
