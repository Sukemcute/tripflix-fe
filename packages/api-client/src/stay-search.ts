import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { staysControllerListStays, suggestControllerSuggest } from './generated/core-api/discovery/discovery';
import type { SuggestionDto } from './generated/core-api/model';
import { useApiSession } from './session';
import { readPage } from './response';

export interface StayFilters {
  placeId: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  rooms: string;
  minStars: string;
  /** Đúng một hạng sao (1–5); khác minStars là "từ X sao trở lên". */
  stars?: string;
  priceMin: string;
  priceMax: string;
  sort: 'price' | 'price_desc' | 'stars';
}
const VIETNAM_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

export function getFutureDate(days: number): string {
  const today = VIETNAM_DATE.format(new Date());
  const [year, month, day] = today.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + days));
  return date.toISOString().split('T')[0]!;
}
export async function getAvailableStays(
  filters: StayFilters,
  options: { signal?: AbortSignal; cursor?: string; limit?: number } = {},
) {
  const query = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined),
  ) as {
    placeId: string;
    checkIn: string;
    checkOut: string;
    adults: string;
  } & Partial<StayFilters>;
  return readPage(
    (
      await staysControllerListStays(
        { ...query, cursor: options.cursor, limit: options.limit },
        { signal: options.signal },
      )
    ).data,
  );
}

export function useStaySearch(
  initialQuery = '',
  initialFilters?: Partial<StayFilters>,
  options: { pageSize?: number } = {},
) {
  const { isReady } = useApiSession();
  const [text, setText] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [selection, setSelection] = useState<SuggestionDto | null>(null);
  const [filters, setFilters] = useState<StayFilters>({
    placeId: '',
    checkIn: getFutureDate(1),
    checkOut: getFutureDate(3),
    adults: '2',
    rooms: '',
    minStars: '',
    priceMin: '',
    priceMax: '',
    sort: 'price',
    ...initialFilters,
  });
  const [submitted, setSubmitted] = useState<StayFilters | null>(initialFilters?.placeId ? filters : null);
  const [cursor, setCursor] = useState<string | undefined>();
  // API chỉ trả nextCursor, nên tự nhớ cursor các trang trước để quay lại.
  const [previousCursors, setPreviousCursors] = useState<(string | undefined)[]>([]);
  const goToFirstPage = () => {
    setCursor(undefined);
    setPreviousCursors([]);
  };
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(text.trim()), 250);
    return () => clearTimeout(timeout);
  }, [text]);
  const suggestions = useQuery({
    queryKey: ['discovery', 'suggest', debounced],
    enabled:
      isReady &&
      !filters.placeId &&
      debounced.length >= 2 &&
      debounced.length <= 100,
    queryFn: async ({ signal }) =>
      readPage((await suggestControllerSuggest({ q: debounced, types: 'place,hotel' }, { signal })).data),
  });
  const stays = useQuery({
    queryKey: ['discovery', 'stays', submitted, cursor, options.pageSize],
    enabled: isReady && !!submitted,
    queryFn: async ({ signal }) => {
      if (!submitted) throw new Error('Search has not been submitted');
      return getAvailableStays(submitted, { cursor, signal, limit: options.pageSize });
    },
  });
  return {
    text,
    setText: (value: string) => {
      setText(value);
      setSelection(null);
    },
    selection,
    filters,
    setFilters,
    submitted,
    suggestions,
    stays,
    choosePlace: (place: SuggestionDto) => {
      setSelection(place);
      setFilters((previous) => ({
        ...previous,
        placeId: place.type === 'place' ? place.refId : '',
      }));
    },
    submit: () => {
      goToFirstPage();
      setSubmitted({ ...filters });
    },
    apply: useCallback((query: string, nextFilters: StayFilters) => {
      setText(query);
      setSelection(null);
      setFilters(nextFilters);
      setSubmitted(nextFilters.placeId ? { ...nextFilters } : null);
      goToFirstPage();
    }, []),
    next: () => {
      const nextCursor = stays.data?.nextCursor;
      if (!nextCursor) return;
      setPreviousCursors((previous) => [...previous, cursor]);
      setCursor(nextCursor);
    },
    previous: () => {
      setCursor(previousCursors.at(-1));
      setPreviousCursors((previous) => previous.slice(0, -1));
    },
    first: goToFirstPage,
    cursor,
    pageNumber: previousCursors.length + 1,
  };
}
