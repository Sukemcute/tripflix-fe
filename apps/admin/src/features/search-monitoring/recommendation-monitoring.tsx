'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHomeRecommendations } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import styles from './search-monitoring.module.css';

const copy = vi.searchMonitoring.recommendations;

export function RecommendationMonitoring() {
  const [recentPlaces, setRecentPlaces] = useState('');
  const [limit, setLimit] = useState('8');
  const [validation, setValidation] = useState('');
  const [request, setRequest] = useState({ recentPlaceIds: [] as string[], limit: 8 });
  const result = useQuery({
    queryKey: ['admin', 'recommendation-monitor', request],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const started = performance.now();
      const items = await getHomeRecommendations(request, signal);
      return { items, elapsedMs: Math.round(performance.now() - started), receivedAt: Date.now(), request };
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recentPlaceIds = recentPlaces
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const count = Number(limit);
    if (
      recentPlaceIds.length > 10 ||
      recentPlaceIds.some((id) => id.length > 64) ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 20
    ) {
      setValidation(copy.invalid);
      return;
    }
    setValidation('');
    const next = { recentPlaceIds, limit: count };
    if (JSON.stringify(next) === JSON.stringify(request)) void result.refetch();
    else setRequest(next);
  }

  const data = result.isError ? undefined : result.data;
  return (
    <div className={styles.results}>
      <section className={styles.panel}>
        <h2>{copy.title}</h2>
        <p>{copy.help}</p>
        <form onSubmit={submit}>
          <label>
            {copy.recentPlaces}
            <input
              value={recentPlaces}
              onChange={(event) => setRecentPlaces(event.target.value)}
              aria-describedby="recommendation-places-help"
            />
          </label>
          <p id="recommendation-places-help">{copy.recentHelp}</p>
          <div className={styles.formRow}>
            <label>
              {copy.limit}
              <input
                type="number"
                min="1"
                max="20"
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
              />
            </label>
            <button className="admin-primary" disabled={result.isFetching}>
              {copy.run}
            </button>
          </div>
          {validation && <p role="alert">{validation}</p>}
        </form>
        {result.isFetching && <output>{vi.api.loading}</output>}
        <AdminApiError error={result.error} />
      </section>
      <section className={styles.panel}>
        <h2>{copy.flow}</h2>
        <ol>
          {copy.stages.map((stage) => (
            <li key={stage}>
              <p>{stage}</p>
            </li>
          ))}
        </ol>
      </section>
      {data && (
        <>
          <section className={styles.panel}>
            <p>
              {copy.received} ·{' '}
              {new Date(data.receivedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' })}
            </p>
            <p>
              {copy.elapsed} · {data.elapsedMs.toLocaleString('vi-VN')} ms
            </p>
            <details>
              <summary>{copy.request}</summary>
              <pre>{JSON.stringify(data.request, null, 2)}</pre>
            </details>
            <p>{copy.reasonHelp}</p>
            {!data.items.length && <p>{copy.empty}</p>}
          </section>
          {data.items.map((destination, index) => (
            <section
              className={styles.panel}
              key={destination.province.slug}
              aria-label={destination.province.name}
            >
              <h3>
                {index + 1}. {destination.province.name}
              </h3>
              <div className={styles.tableScroll}>
                <table>
                  <thead>
                    <tr>
                      <th>{copy.hotel}</th>
                      <th>{copy.stars}</th>
                      <th>{copy.price}</th>
                      <th>{copy.reason}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {destination.hotels.map((hotel) => (
                      <tr key={hotel.hotelId}>
                        <td>
                          <strong>{hotel.name}</strong>
                          <span className={styles.subline}>{hotel.hotelId}</span>
                        </td>
                        <td>{hotel.stars ?? '—'}</td>
                        <td>{hotel.priceFrom.toLocaleString('vi-VN')} ₫</td>
                        <td>
                          {hotel.reason.text}
                          <span className={styles.subline}>{hotel.reason.code}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          <details className={styles.panel}>
            <summary>{copy.raw}</summary>
            <pre>{JSON.stringify({ items: data.items }, null, 2)}</pre>
          </details>
        </>
      )}
    </div>
  );
}
