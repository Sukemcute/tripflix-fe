'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPostSearchResults, readEntity } from '@tripflix/api-client';
import { exploreControllerSearch } from '@tripflix/api-client/core-api/discovery/discovery';
import type {
  ExploreItemDto,
  ExploreRequestDto,
  ExploreResponseDto,
  SearchPostsRequestDto,
} from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { IconTrending } from '../shell/admin-icons';
import { SearchTrends, type SearchObservation } from './search-trends';
import styles from './search-monitoring.module.css';

const copy = vi.searchMonitoring;
const formatMoney = (value: number | null) => (value === null ? copy.none : value.toLocaleString('vi-VN'));
const kindLabel = (kind: string) => copy.kinds[kind as keyof typeof copy.kinds] ?? kind;
type SearchRequest =
  { endpoint: 'explore'; body: ExploreRequestDto } | { endpoint: 'posts'; body: SearchPostsRequestDto };

function ResultTable({ items, offset = 0 }: { items: ExploreItemDto[]; offset?: number }) {
  if (!items.length) return <p className={styles.empty}>{copy.noItems}</p>;
  return (
    <div className={styles.tableScroll}>
      <table>
        <thead>
          <tr>
            <th>{copy.position}</th>
            <th>{copy.item}</th>
            <th>{copy.kind}</th>
            <th>{copy.reason}</th>
            <th>{copy.price}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td className={styles.position}>{offset + index + 1}</td>
              <td>
                <strong>{item.title}</strong>
                <span className={styles.subline}>{item.subtitle ?? copy.none}</span>
                <details>
                  <summary>{copy.detail}</summary>
                  <code>{item.refId}</code>
                  <pre>{JSON.stringify(item, null, 2)}</pre>
                </details>
              </td>
              <td>
                <span className={styles.tag}>{kindLabel(item.kind)}</span>
              </td>
              <td>{item.reason || copy.none}</td>
              <td className={styles.number}>{formatMoney(item.priceFrom)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SearchMonitoring() {
  const [tab, setTab] = useState<keyof typeof copy.tabs>('query');
  const [q, setQ] = useState('');
  const [endpoint, setEndpoint] = useState<SearchRequest['endpoint']>('explore');
  const [postType, setPostType] = useState<NonNullable<SearchPostsRequestDto['postType']>>('all');
  const [limit, setLimit] = useState('20');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [validation, setValidation] = useState('');
  const [request, setRequest] = useState<SearchRequest | null>(null);
  const [section, setSection] = useState('all');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [observations, setObservations] = useState<SearchObservation[]>([]);

  const search = useQuery({
    queryKey: ['admin', 'search-monitor', request],
    enabled: request !== null,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: isMonitoring ? 60_000 : false,
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }) => {
      if (!request) throw new Error('Search request required');
      const started = performance.now();
      function recordObservation(
        total: number | null,
        corrections: number | null,
        sections: SearchObservation['sections'],
      ) {
        if (signal.aborted) return;
        // shortcut: giữ 60 mẫu trong bộ nhớ trang; dùng lịch sử backend khi cần theo dõi qua nhiều phiên.
        setObservations((previous) => [
          ...previous.slice(-59),
          {
            requestKey: JSON.stringify(request),
            recordedAt: Date.now(),
            elapsedMs: Math.round(performance.now() - started),
            total,
            corrections,
            sections,
          },
        ]);
      }
      try {
        if (request.endpoint === 'explore') {
          const response = await exploreControllerSearch(request.body, { signal });
          const data = readEntity(response.data, [
            'understood',
            'sections',
            'suggest',
            'dropped',
          ]) as ExploreResponseDto;
          recordObservation(
            data.sections.reduce((sum, entry) => sum + entry.total, 0),
            Object.keys(data.understood.fixed).length,
            data.sections.map(({ kind, total }) => ({ kind, total })),
          );
          return {
            endpoint: 'explore' as const,
            request,
            data,
            elapsedMs: Math.round(performance.now() - started),
            receivedAt: new Date().toISOString(),
          };
        }
        const data = await getPostSearchResults(request.body, signal);
        recordObservation(data.total, Object.keys(data.understood.fixed).length, []);
        return {
          endpoint: 'posts' as const,
          request,
          data,
          elapsedMs: Math.round(performance.now() - started),
          receivedAt: new Date().toISOString(),
        };
      } catch (error) {
        recordObservation(null, null, []);
        throw error;
      }
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = q.trim();
    if (!query || query.length > 200) return setValidation(copy.invalidQuery);
    if (
      endpoint === 'explore' &&
      (lat.trim() || lng.trim()) &&
      (!lat.trim() ||
        !lng.trim() ||
        !Number.isFinite(Number(lat)) ||
        !Number.isFinite(Number(lng)) ||
        Number(lat) < -90 ||
        Number(lat) > 90 ||
        Number(lng) < -180 ||
        Number(lng) > 180)
    )
      return setValidation(copy.invalidLocation);
    if (endpoint === 'posts' && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 50))
      return setValidation(copy.invalidLimit);
    const next: SearchRequest =
      endpoint === 'explore'
        ? {
            endpoint,
            body: {
              q: query,
              ...(lat.trim() && lng.trim() ? { loc: { lat: Number(lat), lng: Number(lng) } } : {}),
            },
          }
        : { endpoint, body: { q: query, postType, limit: Number(limit) } };
    setValidation('');
    setSection('all');
    setIsMonitoring(false);
    if (JSON.stringify(request) === JSON.stringify(next)) void search.refetch();
    else setRequest(next);
  }

  function useExample(query: string) {
    setQ(query);
    setValidation('');
    setTab('query');
  }

  const result = search.isError ? undefined : search.data;
  const understood = result?.data.understood;
  const total =
    result?.endpoint === 'explore'
      ? result.data.sections.reduce((sum, entry) => sum + entry.total, 0)
      : result?.data.total;
  const shown =
    result?.endpoint === 'explore'
      ? result.data.sections.reduce((sum, entry) => sum + entry.items.length, 0)
      : result?.data.items.length;

  function downloadResult() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tripflix-search-analysis.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className={styles.root}>
      <header className={styles.heading}>
        <div>
          <p className="admin-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <span className="admin-badge">{isMonitoring ? copy.trends.active : copy.readOnly}</span>
      </header>
      <nav className={styles.tabs} aria-label={copy.title}>
        {(Object.keys(copy.tabs) as (keyof typeof copy.tabs)[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}
          >
            {copy.tabs[key]}
          </button>
        ))}
      </nav>

      {tab === 'trends' && (
        <SearchTrends
          query={request?.body.q ?? null}
          samples={observations}
          requestKey={request ? JSON.stringify(request) : null}
          isMonitoring={isMonitoring}
          isFetching={search.isFetching}
          onSample={() => void search.refetch()}
          onToggle={() => {
            setIsMonitoring(!isMonitoring);
            if (!isMonitoring) void search.refetch();
          }}
          onGoQuery={() => setTab('query')}
        />
      )}

      {tab === 'query' && (
        <>
          <section className={styles.panel} aria-label={copy.query}>
            <form onSubmit={submit}>
              <label className={styles.queryLabel}>
                {copy.query}
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  maxLength={200}
                  placeholder={copy.placeholder}
                />
              </label>
              <div className={styles.formRow}>
                <label>
                  {copy.endpoint}
                  <select
                    aria-label={copy.endpoint}
                    value={endpoint}
                    onChange={(event) => setEndpoint(event.target.value as SearchRequest['endpoint'])}
                  >
                    <option value="explore">{copy.explore}</option>
                    <option value="posts">{copy.posts}</option>
                  </select>
                </label>
                {endpoint === 'posts' && (
                  <>
                    <label>
                      {copy.postType}
                      <select
                        aria-label={copy.postType}
                        value={postType}
                        onChange={(event) => setPostType(event.target.value as typeof postType)}
                      >
                        <option value="all">{copy.allPosts}</option>
                        {(['plan', 'video', 'post'] as const).map((kind) => (
                          <option key={kind} value={kind}>
                            {kindLabel(kind)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {copy.limit}
                      <input
                        type="number"
                        min="1"
                        max="50"
                        step="1"
                        value={limit}
                        onChange={(event) => setLimit(event.target.value)}
                      />
                    </label>
                  </>
                )}
                <button className="admin-primary" type="submit" disabled={search.isFetching}>
                  {search.isFetching ? copy.running : copy.run}
                  <IconTrending aria-hidden="true" />
                </button>
              </div>
              {endpoint === 'explore' && (
                <details className={styles.location}>
                  <summary>{copy.location}</summary>
                  <p>{copy.locationHelp}</p>
                  <div className={styles.formRow}>
                    <label>
                      {copy.lat}
                      <input
                        type="number"
                        min="-90"
                        max="90"
                        step="any"
                        value={lat}
                        onChange={(event) => setLat(event.target.value)}
                      />
                    </label>
                    <label>
                      {copy.lng}
                      <input
                        type="number"
                        min="-180"
                        max="180"
                        step="any"
                        value={lng}
                        onChange={(event) => setLng(event.target.value)}
                      />
                    </label>
                  </div>
                </details>
              )}
              {validation && (
                <p role="alert" className={styles.warning}>
                  {validation}
                </p>
              )}
            </form>
            <div className={styles.presets}>
              <span>{copy.presets}</span>
              {['vin com', 'vincom đồng khởi', 'sunworld', 'lot te', 'lottecetner'].map((query) => (
                <button type="button" key={query} onClick={() => useExample(query)}>
                  {query}
                </button>
              ))}
            </div>
          </section>

          <AdminApiError error={search.error} retry={() => void search.refetch()} />
          {search.isFetching && (
            <output className={styles.loading} aria-live="polite">
              {copy.running}
            </output>
          )}
          {!request && (
            <section className={`${styles.panel} ${styles.initial}`}>
              <IconTrending aria-hidden="true" />
              <h2>{copy.initialTitle}</h2>
              <p>{copy.initialBody}</p>
            </section>
          )}

          {result && understood && (
            <div aria-busy={search.isFetching} className={styles.results}>
              <header className={styles.resultHeading}>
                <div>
                  <p className="admin-eyebrow">{copy.resultTitle}</p>
                  <h2>“{result.request.body.q}”</h2>
                  <p>
                    {copy.received}{' '}
                    {new Date(result.receivedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' })} ·{' '}
                    <code>{result.endpoint === 'explore' ? '/api/search' : '/api/search/posts'}</code>
                  </p>
                </div>
                <button className="admin-secondary" onClick={downloadResult}>
                  {copy.export}
                </button>
              </header>
              <div className={styles.metrics} aria-live="polite">
                <div>
                  <span>{result.endpoint === 'explore' ? copy.totalMatches : copy.totalPosts}</span>
                  <strong>{total}</strong>
                </div>
                <div>
                  <span>{copy.showing}</span>
                  <strong>{shown}</strong>
                </div>
                <div>
                  <span>{copy.corrections}</span>
                  <strong>{Object.keys(understood.fixed).length}</strong>
                </div>
                <div>
                  <span>{copy.elapsed}</span>
                  <strong>
                    {result.elapsedMs}
                    <small> ms</small>
                  </strong>
                </div>
              </div>
              <p className={styles.hint}>
                {copy.elapsedHelp} {result.endpoint === 'explore' && copy.matchesHelp}
              </p>
              <section className={styles.panel} aria-label={copy.understanding}>
                <h2>{copy.understanding}</h2>
                <dl className={styles.understood}>
                  <div>
                    <dt>{copy.place}</dt>
                    <dd>{understood.place ?? copy.none}</dd>
                  </div>
                  <div>
                    <dt>{copy.intents}</dt>
                    <dd>{understood.intents.map(kindLabel).join(' → ') || copy.none}</dd>
                  </div>
                  <div>
                    <dt>{copy.budget}</dt>
                    <dd>
                      {formatMoney(understood.budget)}
                      {understood.budget !== null && ' VND'}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.days}</dt>
                    <dd>{understood.days ?? copy.none}</dd>
                  </div>
                  <div>
                    <dt>{copy.names}</dt>
                    <dd>{understood.names.join(' · ') || copy.none}</dd>
                  </div>
                  <div>
                    <dt>{copy.phrases}</dt>
                    <dd>{understood.phrases.join(' · ') || copy.none}</dd>
                  </div>
                  <div>
                    <dt>{copy.fixed}</dt>
                    <dd>
                      {Object.entries(understood.fixed).map(([from, to]) => (
                        <span className={styles.correction} key={from}>
                          {from} → <b>{to}</b>
                        </span>
                      ))}
                      {!Object.keys(understood.fixed).length && copy.none}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.dropped}</dt>
                    <dd>
                      {result.endpoint === 'explore'
                        ? result.data.dropped.join(' · ') || copy.none
                        : copy.unavailable}
                    </dd>
                  </div>
                </dl>
                {result.endpoint === 'explore' && (
                  <p className={styles.hint}>{result.data.nearUser ? copy.nearUser : copy.noNearUser}</p>
                )}
              </section>
              <p className={styles.warning}>{copy.scoreUnavailable}</p>
              {result.endpoint === 'explore' ? (
                <>
                  <section className={styles.panel} aria-label={copy.sectionOrder}>
                    <h2>{copy.sectionOrder}</h2>
                    <p>{copy.sectionHelp}</p>
                    <div className={styles.sections}>
                      <button aria-pressed={section === 'all'} onClick={() => setSection('all')}>
                        {copy.allSections}
                      </button>
                      {result.data.sections.map((entry, index) => (
                        <button
                          key={entry.kind}
                          aria-pressed={section === entry.kind}
                          onClick={() => setSection(entry.kind)}
                        >
                          {index + 1}. {entry.label} <b>{entry.total}</b>
                        </button>
                      ))}
                    </div>
                  </section>
                  {total === 0 && <output className={styles.empty}>{copy.empty}</output>}
                  {result.data.sections
                    .filter((entry) => section === 'all' || section === entry.kind)
                    .map((entry) => (
                      <section className={styles.panel} key={entry.kind} aria-label={entry.label}>
                        <div className={styles.sectionHeading}>
                          <h2>{entry.label}</h2>
                          <span>
                            {entry.items.length} / {entry.total}
                          </span>
                        </div>
                        <ResultTable items={entry.items} />
                      </section>
                    ))}
                  {result.data.suggest.length > 0 && (
                    <section className={styles.panel} aria-label={copy.suggest}>
                      <h2>{copy.suggest}</h2>
                      <p>{copy.suggestHelp}</p>
                      <ResultTable items={result.data.suggest} />
                    </section>
                  )}
                </>
              ) : (
                <section className={styles.panel} aria-label={copy.posts}>
                  <h2>{copy.posts}</h2>
                  <p>{copy.postsHelp}</p>
                  {result.data.total === 0 ? (
                    <output className={styles.empty}>{copy.empty}</output>
                  ) : (
                    <ResultTable items={result.data.items} offset={Number(result.request.body.cursor ?? 0)} />
                  )}
                  <div className={styles.pagination}>
                    <button
                      className="admin-secondary"
                      disabled={search.isFetching || !result.request.body.cursor}
                      onClick={() => {
                        setIsMonitoring(false);
                        setRequest({
                          endpoint: 'posts',
                          body: { ...result.request.body, cursor: undefined },
                        });
                      }}
                    >
                      {copy.first}
                    </button>
                    <button
                      className="admin-secondary"
                      disabled={search.isFetching || result.data.nextCursor === null}
                      onClick={() => {
                        setIsMonitoring(false);
                        setRequest({
                          endpoint: 'posts',
                          body: { ...result.request.body, cursor: result.data.nextCursor },
                        });
                      }}
                    >
                      {copy.next}
                    </button>
                  </div>
                  <p className={styles.hint}>{copy.paginationHelp}</p>
                </section>
              )}
              <details className={styles.panel}>
                <summary>{copy.raw}</summary>
                <pre>{JSON.stringify({ request: result.request, response: result.data }, null, 2)}</pre>
              </details>
            </div>
          )}
        </>
      )}

      {tab === 'cases' && (
        <section className={styles.panel} aria-label={copy.casesTitle}>
          <h2>{copy.casesTitle}</h2>
          <p>{copy.casesHelp}</p>
          <div className={styles.cases}>
            {copy.cases.map((entry, index) => (
              <article key={entry.title}>
                <span className={styles.caseNumber}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{entry.title}</h3>
                  <code>{entry.query}</code>
                  <p>{entry.note}</p>
                  <button className="admin-secondary" onClick={() => useExample(entry.query)}>
                    {copy.tryCase}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'rules' && (
        <>
          <section className={styles.panel}>
            <h2>{copy.rankingTitle}</h2>
            <ol className={styles.steps}>
              {copy.rankingSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <section className={styles.panel}>
            <h2>{copy.referenceTitle}</h2>
            <p>{copy.referenceHelp}</p>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>{copy.parameter}</th>
                    <th>{copy.value}</th>
                    <th>{copy.meaning}</th>
                  </tr>
                </thead>
                <tbody>
                  {copy.parameters.map(([parameter, value, meaning]) => (
                    <tr key={parameter}>
                      <td>
                        <strong>{parameter}</strong>
                      </td>
                      <td className={styles.mono}>{value}</td>
                      <td>{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className={styles.panel}>
            <h2>{copy.indexTitle}</h2>
            <p>{copy.indexHelp}</p>
            <h3>{copy.countsTitle}</h3>
            <p>{copy.countsHelp}</p>
            <pre>
              {
                "select ns, key, n\nfrom discovery.search_counts\nwhere key in ('vincom', 'vin', 'vinh', 'dong khoi')\norder by ns, key;"
              }
            </pre>
            <p className={styles.hint}>{copy.telemetryHelp}</p>
          </section>
        </>
      )}
    </div>
  );
}
