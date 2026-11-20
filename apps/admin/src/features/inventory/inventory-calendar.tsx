'use client';
import * as calendar from '@tripflix/api-client/core-api/admin-commerce/admin-commerce';
import { getFutureDate } from '@tripflix/api-client';
import type { UpdateRoomCalendarDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminButton } from '@/ui/button';
import { SelectInput, TextField } from '@/ui/form-field';
import { EmptyState, LoadingState } from '@/ui/states';
import { AdminApiError } from '../shell/api-state';
import { Panel } from '../shell/operations-ui';
import type { AdminProduct } from '../orders/orders-types';

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
  const [productSearch, setProductSearch] = useState('');
  const [requested, setRequested] = useState<CalendarRequest | null>(null);
  // TF43: chọn mã từ danh sách thay vì gõ tay kiểu H1--STD.
  const products = useQuery({
    queryKey: ['admin-products', kind, productSearch.trim()],
    queryFn: async ({ signal }) =>
      (
        (
          await calendar.adminOrdersControllerProducts(
            { kind, q: productSearch.trim() || undefined, limit: 50 },
            { signal },
          )
        ).data as unknown as { items: AdminProduct[] }
      ).items,
  });
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
  const isFlight = requested?.kind === 'flight';
  return (
    <div className="space-y-5">
      <form
        aria-label={vi.admin.inventory}
        className="grid gap-x-3 gap-y-3 sm:grid-cols-2 xl:grid-cols-[10rem_12rem_minmax(0,1fr)_9rem_9rem_auto] xl:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.reset();
          setPatch({});
          setRequested({ kind, id: id.trim(), from, to });
        }}
      >
        <SelectInput
          label={vi.api.inventory}
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as typeof kind);
            setId('');
          }}
        >
          <option value="room">{vi.api.roomType}</option>
          <option value="flight">{vi.api.flight}</option>
        </SelectInput>
        <TextField
          label={vi.adminOrders.productSearch}
          type="search"
          value={productSearch}
          maxLength={100}
          onChange={(event) => setProductSearch(event.target.value)}
        />
        <SelectInput
          label={vi.adminOrders.productPick}
          required
          value={id}
          onChange={(event) => setId(event.target.value)}
        >
          <option value="">
            {products.data?.length === 0 ? vi.adminOrders.productEmpty : vi.adminOrders.productPickPlaceholder}
          </option>
          {products.data?.map((product) => (
            <option key={product.id} value={product.id}>
              {product.parentName ? `${product.parentName} · ` : ''}
              {product.name} ({product.place})
            </option>
          ))}
        </SelectInput>
        <TextField
          label={vi.api.from}
          type="date"
          required
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <TextField
          label={vi.api.to}
          type="date"
          required
          min={from}
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <AdminButton variant="primary" size="lg" type="submit" disabled={!id.trim() || query.isFetching}>
          {vi.api.loadCalendar}
        </AdminButton>
      </form>
      {!requested && (
        <EmptyState title={vi.adminOperations.calendarEmpty} description={vi.adminOperations.calendarHint} />
      )}
      <AdminApiError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {requested && query.isPending && <LoadingState />}
      {query.data?.length === 0 && <EmptyState title={vi.api.empty} />}
      {requested && query.data && query.data.length > 0 && (
        <Panel title={vi.api.inventory} description={`${requested.id} · ${requested.from} → ${requested.to}`}>
          <div className="overflow-x-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th scope="col">{vi.api.from}</th>
                  <th scope="col" className="text-right">{vi.api.totalInventory}</th>
                  <th scope="col" className="text-right">{vi.api.held}</th>
                  <th scope="col" className="text-right">{vi.api.sold}</th>
                  <th scope="col" className="text-right">{vi.api.remaining}</th>
                  <th scope="col" className="text-right">{vi.api.price}</th>
                  <th scope="col">{vi.api.stopSell}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((day) => (
                  <tr key={day.date}>
                    <td className="whitespace-nowrap">{day.date}</td>
                    <td className="text-right tabular-nums">{day.total}</td>
                    <td className="text-right tabular-nums">{day.held}</td>
                    <td className="text-right tabular-nums">{day.sold}</td>
                    <td className="text-right tabular-nums">{day.remaining}</td>
                    <td className="text-right tabular-nums">
                      {new Intl.NumberFormat('vi-VN').format(day.price)}đ
                    </td>
                    <td>{day.isStopSell ? vi.api.yes : vi.api.no}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form
            aria-label={vi.api.save}
            className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <h3 className="text-sm font-semibold sm:col-span-2 xl:col-span-4">{vi.api.save}</h3>
            {numberFields
              .filter((field) => !isFlight || field === 'total' || field === 'price')
              .map((field) => (
                <TextField
                  key={field}
                  label={labels[field]}
                  type="number"
                  min={field === 'total' ? 0 : 1}
                  max={field.endsWith('Los') ? 14 : undefined}
                  placeholder={vi.api.unchanged}
                  value={patch[field] ?? ''}
                  onChange={(event) => setPatch((previous) => ({ ...previous, [field]: event.target.value }))}
                />
              ))}
            {booleanFields
              .filter((field) => !isFlight || field === 'isStopSell')
              .map((field) => (
                <SelectInput
                  key={field}
                  label={labels[field]}
                  value={patch[field] ?? ''}
                  onChange={(event) => setPatch((previous) => ({ ...previous, [field]: event.target.value }))}
                >
                  <option value="">{vi.api.unchanged}</option>
                  <option value="true">{vi.api.yes}</option>
                  <option value="false">{vi.api.no}</option>
                </SelectInput>
              ))}
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-4">
              <AdminButton
                variant="primary"
                type="submit"
                disabled={mutation.isPending || !Object.values(patch).some((value) => value !== '')}
              >
                {mutation.isPending ? vi.api.saving : vi.api.save}
              </AdminButton>
              {mutation.isSuccess && <output className="text-[13px] text-teal-ink">{vi.api.saved}</output>}
              <AdminApiError error={mutation.error} />
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}
