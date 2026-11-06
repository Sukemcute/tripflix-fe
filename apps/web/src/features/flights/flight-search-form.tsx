'use client';

import { useFlightRoutes, type FlightSearch } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { AirportPicker, type AirportOption } from './airport-picker';
import { DatePicker } from './date-picker';
import { FlightIcon } from './flight-icon';
import styles from './flights.module.css';

const copy = vi.flights;
const airportNames: Readonly<Record<string, string>> = copy.airports;
const MAX_PASSENGERS = 9;

// Tên trong i18n có dạng "Thành phố · Tên sân bay"; API chỉ trả tên điểm đến.
export function toAirportOption(code: string, fallbackName = ''): AirportOption {
  const [city = fallbackName || code, airportName = ''] = (airportNames[code] ?? fallbackName).split(' · ');
  return { code, city, airportName };
}

export function FlightSearchForm({ initial, today }: { initial: FlightSearch | null; today: string }) {
  const routes = useFlightRoutes();
  const [from, setFrom] = useState(initial?.from ?? '');
  const [to, setTo] = useState(initial?.to ?? '');
  const [passengers, setPassengers] = useState(initial?.passengers ?? 1);
  const origins =
    routes.data?.map(({ airport, destinations: list }) => ({
      ...toAirportOption(airport),
      meta: t('flights.flightCount', { count: list.reduce((sum, item) => sum + item.flightCount, 0) }),
    })) ?? [];
  const destinationsOf = (code: string) =>
    routes.data?.find((origin) => origin.airport === code)?.destinations ?? [];
  const destinations = destinationsOf(from).map(({ code, name, flightCount }) => ({
    ...toAirportOption(code, name),
    meta: t('flights.flightCount', { count: flightCount }),
  }));
  const canSearch = destinations.some((destination) => destination.code === to);
  const canSwap = canSearch && destinationsOf(to).some((destination) => destination.code === from);

  return (
    <form action="/flights" method="get" className={styles.searchPanel}>
      <div className={styles.searchHeading}>
        <span className={styles.tripType}>
          <FlightIcon name="plane" size={16} />
          {copy.oneWay}
        </span>
        {routes.isPending && <output className={styles.searchHint}>{vi.api.loading}</output>}
        {routes.data?.length === 0 && <output className={styles.searchHint}>{copy.noRoutes}</output>}
      </div>
      <div className={styles.searchRow}>
        <div className={styles.routeFields}>
          <AirportPicker
            label={copy.from}
            name="from"
            icon="takeoff"
            value={from}
            options={origins}
            placeholder={copy.selectAirport}
            isDisabled={!origins.length}
            onChange={(code) => {
              setFrom(code);
              if (!destinationsOf(code).some((destination) => destination.code === to)) setTo('');
            }}
          />
          <button
            type="button"
            className={styles.swapButton}
            aria-label={copy.swap}
            title={copy.swap}
            disabled={!canSwap}
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
          >
            <FlightIcon name="swap" size={18} />
          </button>
          <AirportPicker
            label={copy.to}
            name="to"
            icon="landing"
            value={to}
            options={destinations}
            placeholder={from ? copy.selectAirport : copy.selectOriginFirst}
            isDisabled={!destinations.length}
            onChange={setTo}
          />
        </div>
        <DatePicker name="date" label={copy.date} today={today} initialValue={initial?.date ?? today} />
        <div className={styles.field + ' ' + styles.passengerField}>
          <span className={styles.fieldIcon}>
            <FlightIcon name="users" size={22} />
          </span>
          <fieldset className={styles.fieldBody}>
            <legend className={styles.fieldLabel}>{copy.adults}</legend>
            <span className={styles.stepper}>
              <button
                type="button"
                aria-label={copy.decreasePassengers}
                disabled={passengers <= 1}
                onClick={() => setPassengers((count) => count - 1)}
              >
                <FlightIcon name="minus" size={16} />
              </button>
              <output aria-live="polite">
                {passengers} <span>{copy.passengersUnit}</span>
              </output>
              <button
                type="button"
                aria-label={copy.increasePassengers}
                disabled={passengers >= MAX_PASSENGERS}
                onClick={() => setPassengers((count) => count + 1)}
              >
                <FlightIcon name="plus" size={16} />
              </button>
            </span>
            <input type="hidden" name="passengers" value={passengers} />
            {initial?.sort && <input type="hidden" name="sort" value={initial.sort} />}
          </fieldset>
        </div>
        <button type="submit" className={styles.searchButton} disabled={!canSearch}>
          <FlightIcon name="search" size={20} />
          {copy.search}
        </button>
      </div>
      <ApiErrorNotice error={routes.error} retry={() => void routes.refetch()} />
    </form>
  );
}
