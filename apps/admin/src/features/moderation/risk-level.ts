export function getRiskLevel(score: number) {
  if (score >= 90) return { label: 'Rất cao', tone: 'critical' } as const;
  if (score >= 80) return { label: 'Cao', tone: 'high' } as const;
  if (score >= 50) return { label: 'Trung bình', tone: 'medium' } as const;
  return { label: 'Thấp', tone: 'low' } as const;
}

export function getContentWarning(flags: Record<string, unknown>) {
  const rules = Array.isArray(flags.rules) ? flags.rules : [];
  const codes = new Set(rules.flatMap((rule: unknown) =>
    rule && typeof rule === 'object' && 'code' in rule && typeof rule.code === 'string'
      ? [rule.code] : [],
  ));
  if (codes.has('SCAM_PATTERN')) return { label: 'Dấu hiệu lừa đảo', tone: 'critical' } as const;
  if (codes.has('THREAT')) return { label: 'Ngôn từ đe dọa', tone: 'high' } as const;
  if (codes.has('PROFANITY')) return { label: 'Ngôn từ xúc phạm', tone: 'high' } as const;
  if (codes.size) return { label: 'Bộ lọc phát hiện dấu hiệu', tone: 'medium' } as const;
  return null;
}

export function getVisobertScore(flags: Record<string, unknown>): number | null {
  const ai = flags.ai;
  if (!ai || typeof ai !== 'object' || !('scores' in ai)) return null;
  const scores = ai.scores;
  if (!scores || typeof scores !== 'object' || !('visobert/toxic' in scores)) return null;
  const score = scores['visobert/toxic'];
  return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1
    ? score
    : null;
}
