'use client';

import { t, vi, type MessageKey } from '@tripflix/i18n';
import { useState } from 'react';

export function ModuleContent({ label }: { label: MessageKey }) {
  const copy = vi.demo.admin;
  const datasets: Record<
    string,
    { description: string; metric: string; value: string; names: string[]; statuses: string[] }
  > = {
    'admin.moderation': {
      description: copy.moderationBody,
      metric: copy.metricReview,
      value: '03',
      names: [copy.record1, copy.record2, copy.record3],
      statuses: [copy.waiting, copy.complete, copy.waiting],
    },
    'admin.analytics': {
      description: copy.analyticsBody,
      metric: copy.metricViews,
      value: '4.620',
      names: [copy.analytic1, copy.analytic2, copy.analytic3],
      statuses: [copy.active, copy.active, copy.active],
    },
    'admin.inventory': {
      description: copy.inventoryBody,
      metric: copy.metricServices,
      value: '03',
      names: [copy.service1, copy.service2, copy.service3],
      statuses: [copy.active, copy.active, copy.waiting],
    },
    'admin.orders': {
      description: copy.ordersBody,
      metric: copy.metricOrders,
      value: '03',
      names: [copy.order1, copy.order2, copy.order3],
      statuses: [copy.complete, copy.waiting, copy.complete],
    },
    'admin.staff': {
      description: copy.staffBody,
      metric: copy.metricStaff,
      value: '03',
      names: [copy.staff1, copy.staff2, copy.staff3],
      statuses: [copy.active, copy.active, copy.active],
    },
  };
  const dataset = datasets[label]!;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const rows = dataset.names
    .map((name, index) => ({ name, status: dataset.statuses[index]! }))
    .filter(
      (row) =>
        row.name.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN')) &&
        (status === 'all' || row.status === status),
    );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{copy.workspace}</p>
          <h1>{t(label)}</h1>
          <p>{dataset.description}</p>
        </div>
        <span className="admin-badge">{vi.demo.common.badge}</span>
      </div>
      <section className="admin-metric">
        <div>
          <span>{dataset.metric}</span>
          <strong>{dataset.value}</strong>
        </div>
        <p>{copy.metricHelp}</p>
      </section>
      <section className="admin-data">
        <div className="admin-data-heading">
          <div>
            <h2>{copy.preview}</h2>
            <p>{copy.previewBody}</p>
          </div>
          <span>
            {rows.length} {copy.rows}
          </span>
        </div>
        <div className="admin-filters">
          <label>
            {copy.search}
            <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} />
          </label>
          <label>
            {copy.status}
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">{copy.all}</option>
              {[...new Set(dataset.statuses)].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>{copy.item}</th>
                <th>{copy.status}</th>
                <th>{copy.detail}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>
                    <span className={`admin-status ${row.status === copy.waiting ? 'waiting' : ''}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="admin-text-button"
                      onClick={() => setSelected(row.name)}
                      aria-label={`${copy.detail}: ${row.name}`}
                    >
                      {copy.detail} ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <output className="admin-empty">{copy.empty}</output>}
        {selected && (
          <section className="admin-record" aria-label={copy.record}>
            <div>
              <p className="admin-eyebrow">{copy.record}</p>
              <h3>{selected}</h3>
              <p>{copy.noMutation}</p>
            </div>
            <button className="admin-secondary" onClick={() => setSelected(null)}>
              {copy.close}
            </button>
          </section>
        )}
      </section>
    </>
  );
}
