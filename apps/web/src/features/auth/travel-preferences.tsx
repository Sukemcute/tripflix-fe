'use client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import type { MyProfileDto, TravelPreferencesDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { surveyHref } from '@/features/onboarding/post-auth';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { useMyProfile } from './account-profile';

type Draft = Pick<TravelPreferencesDto, 'interests' | 'regions' | 'budgetLevels'>;
type FieldProps = { label: string; options: Record<string, string>; value: string[]; onChange: (next: string[]) => void };

/** <details> không tự đóng khi bấm ra ngoài hoặc Esc; danh sách đang mở sẽ che nút Lưu bên dưới. */
function useDismissible() {
  const ref = useRef<HTMLDetailsElement>(null);
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
  return ref;
}

/** Giữ thứ tự mã theo danh sách gốc, không theo thứ tự bấm. */
const ordered = (options: Record<string, string>, codes: string[]) => Object.keys(options).filter((c) => codes.includes(c));

/** Kiểu đính tag: mỗi lựa chọn một pill có nút bỏ, nút "+" mở danh sách còn lại. Nhiều pill thì xuống dòng trong khung. */
function TagPicker({ label, options, value, onChange }: FieldProps) {
  const ref = useDismissible();
  const labelId = useId();
  const remaining = Object.keys(options).filter((c) => !value.includes(c));
  return (
    <div className="travel-field">
      <span className="travel-field-label" id={labelId}>
        {label}
      </span>
      <fieldset className="travel-tags" aria-labelledby={labelId}>
        {value.map((code) => (
          <button
            key={code}
            type="button"
            className="travel-tag"
            aria-label={vi.api.travelRemove.replace('{label}', options[code] ?? code)}
            onClick={() => onChange(value.filter((c) => c !== code))}
          >
            {options[code] ?? code}
            <span aria-hidden="true">×</span>
          </button>
        ))}
        {!value.length && <span className="auth-hint">{vi.api.travelAny}</span>}
        {remaining.length > 0 && (
          // Cùng name: mở ô này thì trình duyệt tự đóng ô kia, hai danh sách không đè nhau.
          <details ref={ref} className="travel-add" name="travel-add">
            <summary aria-label={`${vi.api.travelAdd}: ${label}`}>+</summary>
            <div className="travel-menu">
              {remaining.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="travel-select-option"
                  onClick={() => {
                    if (ref.current) ref.current.open = false;
                    onChange(ordered(options, [...value, code]));
                  }}
                >
                  {options[code]}
                </button>
              ))}
            </div>
          </details>
        )}
      </fieldset>
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
        </div>
        <Link prefetch={false} className="secondary-button" href={surveyHref('/account', 'edit')}>
          {vi.api.onboardingRedo}
        </Link>
      </header>
      <form
        className="travel-form"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate({ status: isEmpty ? 'skipped' : 'completed', ...current, updatedAt: new Date().toISOString() });
        }}
      >
        <div className="travel-fields">
          <TagPicker
            label={vi.api.travelInterests}
            options={vi.api.travelInterestOptions}
            value={current.interests}
            onChange={(interests) => setDraft({ ...current, interests: interests as Draft['interests'] })}
          />
          <TagPicker
            label={vi.api.travelRegions}
            options={vi.api.travelRegionOptions}
            value={current.regions}
            onChange={(regions) => setDraft({ ...current, regions: regions as Draft['regions'] })}
          />
          <TagPicker
            label={vi.api.travelBudgetLevels}
            options={vi.api.travelBudgetLevelOptions}
            value={current.budgetLevels}
            onChange={(budgetLevels) => setDraft({ ...current, budgetLevels: budgetLevels as Draft['budgetLevels'] })}
          />
        </div>
        {saved && !isDirty && (
          <p className="auth-hint">
            {vi.api.travelUpdatedAt.replace('{time}', new Date(saved.updatedAt).toLocaleString('vi-VN'))}
          </p>
        )}
        <ApiErrorNotice error={save.error} />
        {save.isSuccess && !isDirty && <output className="auth-hint">{vi.api.travelSaved}</output>}
        <div className="profile-actions">
          <button className="primary-button" disabled={save.isPending || !isDirty} aria-busy={save.isPending}>
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
