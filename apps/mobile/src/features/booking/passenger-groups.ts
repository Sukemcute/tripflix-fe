export type PassengerCounts = { adults: number; children: number; infants: number };
export type PassengerGroup = { kind: 'adults' | 'children' | 'infants'; count: number };

/** Chỉ liệt kê nhóm có người: "2 người lớn" thay cho "2 người lớn · 0 trẻ em · 0 em bé". Người lớn luôn có mặt. */
export function listPassengerGroups(counts: PassengerCounts): PassengerGroup[] {
  const groups: PassengerGroup[] = [{ kind: 'adults', count: counts.adults }];
  if (counts.children > 0) groups.push({ kind: 'children', count: counts.children });
  if (counts.infants > 0) groups.push({ kind: 'infants', count: counts.infants });
  return groups;
}
