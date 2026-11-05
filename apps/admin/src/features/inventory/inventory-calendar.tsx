'use client';
import * as calendar from '@tripflix/api-client/core-api/admin-commerce/admin-commerce';
import { getFutureDate } from '@tripflix/api-client';
import type { UpdateRoomCalendarDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';

interface CalendarRequest {
  kind: 'room' | 'flight';
  id: string;
  from: string;
  to: string;
}
const numberFields = ['total', 'price', 'minLos', 'maxLos'] as const;
const booleanFields = ['isStopSell', 'isClosedToArrival', 'isClosedToDeparture'] as const;
const labels = {
  total: vi.api.totalInventory,
  price: vi.api.price,
  minLos: vi.api.minLos,
  maxLos: vi.api.maxLos,
  isStopSell: vi.api.stopSell,
  isClosedToArrival: vi.api.closedArrival,
  isClosedToDeparture: vi.api.closedDeparture,
};

export function InventoryCalendar() {
  const client = useQueryClient();
  const [kind, setKind] = useState<'room' | 'flight'>('room');
  const [id, setId] = useState('');
  const [from, setFrom] = useState(getFutureDate(1));
  const [to, setTo] = useState(getFutureDate(7));
  const [requested, setRequested] = useState<CalendarRequest | null>(null);
  const [patch, setPatch] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ['calendar', requested],
    enabled: !!requested,
    queryFn: async ({ signal }) => {
      if (!requested) throw new Error('No calendar selected');
      const range = { from: requested.from, to: requested.to };
      return requested.kind === 'room'
        ? (
            await calendar.adminCalendarControllerGetRoomCalendar(encodeURIComponent(requested.id), range, {
              signal,
            })
          ).data
        : (
            await calendar.adminCalendarControllerGetFlightCalendar(encodeURIComponent(requested.id), range, {
              signal,
            })
          ).data;
    },
  });
  const mutation = useMutation({
    mutationFn: async () => {
      if (!requested) throw new Error('No calendar selected');
      const changes: UpdateRoomCalendarDto = { from: requested.from, to: requested.to };
      for (const field of numberFields)
        if (
          patch[field] !== undefined &&
          patch[field] !== '' &&
          (requested.kind === 'room' || field === 'total' || field === 'price')
        )
          changes[field] = Number(patch[field]);
      for (const field of booleanFields)
        if (patch[field] && (requested.kind === 'room' || field === 'isStopSell'))
          changes[field] = patch[field] === 'true';
      return requested.kind === 'room'
        ? calendar.adminCalendarControllerUpdateRoomCalendar(encodeURIComponent(requested.id), changes)
        : calendar.adminCalendarControllerUpdateFlightCalendar(encodeURIComponent(requested.id), {
            from: changes.from,
            to: changes.to,
            total: changes.total,
            price: changes.price,
            isStopSell: changes.isStopSell,
          });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['calendar'] }),
  });
  return (
    <>
      <form
        className="admin-filters"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.reset();
          setPatch({});
          setRequested({ kind, id: id.trim(), from, to });
        }}
      >
        <label>
          {vi.api.inventory}
          <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="room">{vi.api.roomType}</option>
            <option value="flight">{vi.api.flight}</option>
          </select>
        </label>
        <label>
          {vi.api.resourceId}
          <input required value={id} maxLength={100} onChange={(event) => setId(event.target.value)} />
        </label>
        <label>
          {vi.api.from}
          <input type="date" required value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          {vi.api.to}
          <input type="date" required value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <button className="admin-primary" disabled={!id.trim() || query.isFetching}>
          {vi.api.loadCalendar}
        </button>
      </form>
      <AdminApiError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {requested && query.isPending && <output>{vi.api.loading}</output>}
      {query.data?.length === 0 && <p className="admin-empty">{vi.api.empty}</p>}
      {requested && query.data && (
        <>
          <p>
            {requested.id} · {requested.from} → {requested.to}
          </p>
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{vi.api.from}</th>
                  <th>{vi.api.totalInventory}</th>
                  <th>{vi.api.held}</th>
                  <th>{vi.api.sold}</th>
                  <th>{vi.api.remaining}</th>
                  <th>{vi.api.price}</th>
                  <th>{vi.api.stopSell}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((day) => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    <td>{day.total}</td>
                    <td>{day.held}</td>
                    <td>{day.sold}</td>
                    <td>{day.remaining}</td>
                    <td>{new Intl.NumberFormat('vi-VN').format(day.price)}đ</td>
                    <td>{day.isStopSell ? vi.api.yes : vi.api.no}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form
            className="admin-login-form"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <h2>{vi.api.save}</h2>
            {numberFields
              .filter((field) => requested.kind === 'room' || field === 'total' || field === 'price')
              .map((field) => (
                <label key={field}>
                  {labels[field]}
                  <input
                    type="number"
                    min={field === 'total' ? 0 : 1}
                    max={field.endsWith('Los') ? 14 : undefined}
                    placeholder={vi.api.unchanged}
                    value={patch[field] ?? ''}
                    onChange={(event) =>
                      setPatch((previous) => ({ ...previous, [field]: event.target.value }))
                    }
                  />
                </label>
              ))}
            {booleanFields
              .filter((field) => requested.kind === 'room' || field === 'isStopSell')
              .map((field) => (
                <label key={field}>
                  {labels[field]}
                  <select
                    value={patch[field] ?? ''}
                    onChange={(event) =>
                      setPatch((previous) => ({ ...previous, [field]: event.target.value }))
                    }
                  >
                    <option value="">{vi.api.unchanged}</option>
                    <option value="true">{vi.api.yes}</option>
                    <option value="false">{vi.api.no}</option>
                  </select>
                </label>
              ))}
            <AdminApiError error={mutation.error} />
            {mutation.isSuccess && <output>{vi.api.saved}</output>}
            <button
              className="admin-primary"
              disabled={mutation.isPending || !Object.values(patch).some((value) => value !== '')}
            >
              {mutation.isPending ? vi.api.saving : vi.api.save}
            </button>
          </form>
        </>
      )}
    </>
  );
}
