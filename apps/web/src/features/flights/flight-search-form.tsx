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
/** Ngày về mặc định khi mới bật khứ hồi: 3 ngày sau ngày đi. */
const DEFAULT_STAY_DAYS = 3;
const addDays = (iso: string, days: number) =>
  new Date(new Date(iso + 'T00:00:00Z').getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export type FlightTripType = 'oneWay' | 'round';

// Tên trong i18n có dạng "Thành phố · Tên sân bay"; API chỉ trả tên điểm đến.
export function toAirportOption(code: string, fallbackName = ''): AirportOption {
  const [city = fallbackName || code, airportName = ''] = (airportNames[code] ?? fallbackName).split(' · ');
  return { code, city, airportName };
}

interface FlightSearchFormProps {
  initial: FlightSearch | null;
  initialTripType: FlightTripType;
  initialReturnDate: string | null;
  today: string;
}

export function FlightSearchForm({
  initial,
  initialTripType,
  initialReturnDate,
  today,
}: FlightSearchFormProps) {
  const routes = useFlightRoutes();
  const [from, setFrom] = useState(initial?.from ?? '');
  const [to, setTo] = useState(initial?.to ?? '');
  const [passengers, setPassengers] = useState(initial?.passengers ?? 1);
  const [tripType, setTripType] = useState<FlightTripType>(initialTripType);
  const initialDate = initial?.date && initial.date >= today ? initial.date : today;
  const [date, setDate] = useState(initialDate);
  const [returnDate, setReturnDate] = useState(
    initialReturnDate && initialReturnDate >= initialDate
      ? initialReturnDate
      : addDays(initialDate, DEFAULT_STAY_DAYS),
  );
  const isRound = tripType === 'round';
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
        <fieldset className={styles.tripTabs}>
          <legend className={styles.srOnly}>{copy.tripTypeLabel}</legend>
          {(
            [
              ['oneWay', copy.oneWay, 'plane'],
              ['round', copy.roundTrip, 'swap'],
            ] as const
          ).map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={tripType === value}
              onClick={() => setTripType(value)}
            >
              <FlightIcon name={icon} size={16} />
              {label}
            </button>
          ))}
        </fieldset>
        {isRound && <input type="hidden" name="trip" value="round" />}
        {routes.isPending && <output className={styles.searchHint}>{vi.api.loading}</output>}
        {routes.data?.length === 0 && <output className={styles.searchHint}>{copy.noRoutes}</output>}
      </div>
      <div className={styles.searchRow} data-round={isRound || undefined}>
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
        <div className={styles.dateFields}>
          <DatePicker
            name="date"
            label={copy.date}
            today={today}
            value={date}
            onChange={(value) => {
              setDate(value);
              // Ngày về không được trước ngày đi: dời theo, giữ nguyên số ngày ở lại.
              if (returnDate < value) setReturnDate(addDays(value, DEFAULT_STAY_DAYS));
            }}
          />
          {isRound && (
            <DatePicker
              name="returnDate"
              label={copy.returnDate}
              dialogLabel={copy.pickReturnDate}
              today={today}
              minDate={date}
              rangeStart={date}
              value={returnDate}
              onChange={setReturnDate}
            />
          )}
        </div>
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
        <button type="submit" className={'ripple-button ' + styles.searchButton} disabled={!canSearch}>
          <FlightIcon name="search" size={20} />
          {copy.search}
        </button>
      </div>
      <ApiErrorNotice error={routes.error} retry={() => void routes.refetch()} />
    </form>
  );
}
