'use client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import type { MyProfileDto, TravelPreferencesDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useEffect, useRef, useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { useMyProfile } from './account-profile';

type Draft = Pick<TravelPreferencesDto, 'interests' | 'regions' | 'budgetLevels'>;
type Field = keyof Draft;

const FIELDS: { field: Field; label: string; options: Record<string, string> }[] = [
  { field: 'interests', label: vi.api.travelInterests, options: vi.api.travelInterestOptions },
  { field: 'regions', label: vi.api.travelRegions, options: vi.api.travelRegionOptions },
  { field: 'budgetLevels', label: vi.api.travelBudgetLevels, options: vi.api.travelBudgetLevelOptions },
];

/** Ô dropdown chọn nhiều: <details> gốc của trình duyệt, mở ra danh sách checkbox; giữ thứ tự mã theo danh sách gốc. */
function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Record<string, string>;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  // <details> không tự đóng khi bấm ra ngoài; danh sách mở sẽ che nút Lưu bên dưới.
  useEffect(() => {
    const close = (event: Event) => {
      const details = ref.current;
      if (!details?.open) return;
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !details.contains(event.target as Node)) {
        details.open = false;
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);
  const codes = Object.keys(options);
  const summary = value.length ? value.map((code) => options[code] ?? code).join(', ') : vi.api.travelAny;
  return (
    <div className="travel-field">
      <span className="travel-field-label">{label}</span>
      {/* Cùng name: trình duyệt tự đóng ô kia khi mở ô này, hai danh sách không đè nhau. */}
      <details ref={ref} className="travel-select" name="travel-select">
        <summary aria-label={`${label}: ${summary}`}>{summary}</summary>
        <fieldset aria-label={label}>
          {codes.map((code) => (
            <label key={code} className="travel-select-option">
              <input
                type="checkbox"
                checked={value.includes(code)}
                onChange={() => onChange(codes.filter((c) => (c === code ? !value.includes(c) : value.includes(c))))}
              />
              {options[code]}
            </label>
          ))}
        </fieldset>
      </details>
    </div>
  );
}

/**
 * Thẻ "Sở thích du lịch" (TF106): cùng dữ liệu với khảo sát onboarding mobile, lưu vào hồ sơ qua PATCH /auth/me.
 * Chỉ để gợi ý điểm đến; hiện chỉ lưu. Không chọn gì thì lưu status skipped.
 */
export function TravelPreferencesCard({ userId }: { userId: string }) {
  const client = useQueryClient();
  const profile = useMyProfile(userId);
  const saved = profile.data?.travelPreferences ?? null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const current: Draft = draft ?? {
    interests: saved?.interests ?? [],
    regions: saved?.regions ?? [],
    budgetLevels: saved?.budgetLevels ?? [],
  };

  const save = useMutation({
    mutationFn: async (travelPreferences: TravelPreferencesDto | null) =>
      (await auth.accountControllerUpdateProfile({ travelPreferences })).data as MyProfileDto,
    onSuccess: (me) => {
      client.setQueryData(['account', 'me', userId], me);
      setDraft(null);
    },
  });

  if (!profile.data) return null;
  const isDirty = draft !== null;
  const isEmpty = Object.values(current).every((codes) => !codes.length);

  return (
    <section className="profile-card" aria-labelledby="travel-title">
      <header className="profile-card-header">
        <div>
          <h2 id="travel-title">{vi.api.travelTitle}</h2>
          <p className="auth-hint">{vi.api.travelHint}</p>
        </div>
      </header>
      <form
        className="travel-form"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate({ status: isEmpty ? 'skipped' : 'completed', ...current, updatedAt: new Date().toISOString() });
        }}
      >
        <div className="travel-fields">
          {FIELDS.map(({ field, label, options }) => (
            <MultiSelect
              key={field}
              label={label}
              options={options}
              value={current[field]}
              onChange={(next) => setDraft({ ...current, [field]: next })}
            />
          ))}
        </div>
        {saved && !isDirty && (
          <p className="auth-hint">
            {vi.api.travelUpdatedAt.replace('{time}', new Date(saved.updatedAt).toLocaleString('vi-VN'))}
          </p>
        )}
        <ApiErrorNotice error={save.error} />
        {save.isSuccess && !isDirty && <output className="auth-hint">{vi.api.travelSaved}</output>}
        <div className="profile-actions">
          <button className="primary-button" disabled={save.isPending || !isDirty}>
            {save.isPending ? vi.api.saving : vi.api.save}
          </button>
          {saved && (
            <button type="button" className="secondary-button" disabled={save.isPending} onClick={() => save.mutate(null)}>
              {vi.api.travelReset}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
