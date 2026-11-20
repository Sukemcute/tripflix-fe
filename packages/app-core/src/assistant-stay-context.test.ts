import { describe, expect, it } from 'vitest';
import { isValidAssistantStay, resolveAssistantStayContext } from './assistant-stay-context';

describe('Tripi stay handoff', () => {
  const card = { checkIn: '2026-12-01', checkOut: '2026-12-03' };
  it('uses the latest trip even when opening an older card, including every guest type', () => {
    expect(
      resolveAssistantStayContext(card, {
        dateFrom: '2026-12-12',
        dateTo: '2026-12-15',
        adults: 3,
        children: 2,
        infants: 1,
      }),
    ).toEqual({ checkIn: '2026-12-12', checkOut: '2026-12-15', adults: 3, children: 2, infants: 1 });
  });
  it('keeps missing dates empty and does not revive dates cleared in the current trip', () => {
    expect(resolveAssistantStayContext({}).checkIn).toBe('');
    expect(resolveAssistantStayContext(card, { dateFrom: null, dateTo: null }).checkIn).toBe('');
    expect(resolveAssistantStayContext(card).checkOut).toBe(card.checkOut);
  });
  it('requires real future dates, a later checkout and a valid party before pricing', () => {
    const stay = resolveAssistantStayContext(card, {
      dateFrom: card.checkIn,
      dateTo: card.checkOut,
      adults: 2,
      children: 1,
      infants: 1,
    });
    expect(isValidAssistantStay(stay, '2026-11-20')).toBe(true);
    for (const invalid of [
      { checkIn: '' },
      { checkIn: '2026-11-19' },
      { checkOut: stay.checkIn },
      { checkOut: '2026-12-32' },
      { adults: 0 },
      { adults: NaN },
      { children: -1 },
      { infants: 3 },
      { children: 0.5 },
      { adults: 8, children: 1, infants: 1 },
    ])
      expect(isValidAssistantStay({ ...stay, ...invalid }, '2026-11-20')).toBe(false);
  });
});
