'use client';

import { useFlightRoutes, type FlightSearch } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { SoftDatePicker } from '@/features/shared/soft-date-picker';
import { SoftSelect } from '@/features/shared/soft-select';
import styles from './flights.module.css';

const copy = vi.flights;
const airportNames: Readonly<Record<string, string>> = copy.airports;

export function FlightSearchForm({ initial, today }: { initial: FlightSearch | null; today: string }) {
  const routes = useFlightRoutes();
  const [from, setFrom] = useState(initial?.from ?? '');
  const [to, setTo] = useState(initial?.to ?? '');
  const destinations = routes.data?.find((origin) => origin.airport === from)?.destinations ?? [];
  const canSearch = destinations.some((destination) => destination.code === to);

  return (
    <form action="/flights" method="get" className={styles.form}>
      <div className={styles.fields}>
        <label>
          {copy.from}
          <SoftSelect
            name="from"
            aria-label={copy.from}
            required
            value={from}
            disabled={!routes.data?.length}
            onChange={(value) => {
              setFrom(value);
              setTo('');
            }}
            options={[
              { value: '', label: copy.selectAirport },
              ...(routes.data ?? []).map(({ airport }) => ({
                value: airport,
                label: airportNames[airport] ? airport + ' · ' + airportNames[airport] : airport,
              })),
            ]}
          />
        </label>
        <label>
          {copy.to}
          <SoftSelect
            name="to"
            aria-label={copy.to}
            required
            value={to}
            disabled={!destinations.length}
            onChange={setTo}
            options={[
              { value: '', label: from ? copy.selectAirport : copy.selectOriginFirst },
              ...destinations.map(({ code, name }) => ({ value: code, label: `${code} · ${name}` })),
            ]}
          />
        </label>
        <label>
          {copy.date}
          <SoftDatePicker name="date" min={today} required defaultValue={initial?.date ?? today} />
        </label>
        <label>
          {copy.adults}
          <SoftSelect
            name="passengers"
            aria-label={copy.adults}
            defaultValue={String(initial?.passengers ?? 1)}
            options={Array.from({ length: 9 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }))}
          />
        </label>
        <button type="submit" className="primary-button" disabled={!canSearch}>
          {copy.search}
        </button>
      </div>
      {routes.isPending && <output className="small muted">{vi.api.loading}</output>}
      <ApiErrorNotice error={routes.error} retry={() => void routes.refetch()} />
      {routes.data?.length === 0 && <output className="small muted">{copy.noRoutes}</output>}
    </form>
  );
}
