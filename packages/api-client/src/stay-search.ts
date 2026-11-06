import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
  priceMin: string;
  priceMax: string;
  sort: 'price' | 'stars';
}
export function getFutureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export async function getAvailableStays(
  filters: StayFilters,
  options: { signal?: AbortSignal; cursor?: string; limit?: number } = {},
) {
  const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')) as {
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
      (!initialFilters?.placeId || !filters.placeId) &&
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
