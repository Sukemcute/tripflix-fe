'use client';
import { HttpError, useApiSession } from '@tripflix/api-client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import type { MyProfileDto, UpdateProfileDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useState, type ReactNode } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { SoftDatePicker } from '@/features/shared/soft-date-picker';
import { SoftSelect } from '@/features/shared/soft-select';

type Gender = keyof typeof vi.api.genderOptions;
type FieldName = 'displayName' | 'phone' | 'dateOfBirth' | 'gender' | 'nationality';
type Draft = Record<FieldName, string>;

/** Mã quốc gia hay gặp; tên hiển thị lấy từ Intl.DisplayNames của trình duyệt (tiếng Việt). */
const NATIONALITIES = [
  'VN',
  'US',
  'GB',
  'AU',
  'CA',
  'CN',
  'TW',
  'HK',
  'JP',
  'KR',
  'SG',
  'TH',
  'MY',
  'ID',
  'PH',
  'LA',
  'KH',
  'IN',
  'FR',
  'DE',
  'IT',
  'ES',
  'NL',
  'RU',
  'NZ',
] as const;
/** Không cho chọn ngày sinh ở tương lai (tính một lần khi tải trang). */
const TODAY = new Date().toISOString().slice(0, 10);
const regionNames =
  typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['vi'], { type: 'region' }) : null;
const describeNationality = (code: string) => regionNames?.of(code) ?? code;
const describeGender = (gender: string | null) =>
  gender && gender in vi.api.genderOptions ? vi.api.genderOptions[gender as Gender] : null;
const describeDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN') : null;

const toDraft = (profile: MyProfileDto): Draft => ({
  displayName: profile.displayName,
  phone: profile.phone ?? '',
  dateOfBirth: profile.dateOfBirth ?? '',
  gender: profile.gender ?? '',
  nationality: profile.nationality ?? '',
});

/** Lỗi 400 của BE: { errors: [{ field, message }] } → thông báo theo từng trường. */
function readFieldErrors(error: unknown): Partial<Record<FieldName, string>> {
  if (!(error instanceof HttpError) || error.status !== 400) return {};
  const errors = (error.body as { errors?: { field: string; message: string }[] } | null)?.errors ?? [];
  return Object.fromEntries(errors.map((e) => [e.field, e.message]));
}

/** Hồ sơ của chính mình (GET /auth/me), dùng chung khoá query với nơi khác cần thông tin cá nhân. */
export function useMyProfile(userId: string) {
  return useQuery({
    queryKey: ['account', 'me', userId],
    queryFn: async ({ signal }) => (await auth.authControllerGetMe({ signal })).data as MyProfileDto,
  });
}

/**
 * Thẻ "Thông tin cá nhân": mặc định chỉ xem (các ô nhãn + giá trị), bấm "Chỉnh sửa" mới sửa.
 * Chỉ gửi các trường đã đổi; ô để trống là xoá trường đó (trừ tên hiển thị).
 */
export function ProfileInfoCard({ userId }: { userId: string }) {
  const { session } = useApiSession();
  const client = useQueryClient();
  const profile = useMyProfile(userId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const isEditing = draft !== null;
  const save = useMutation({
    mutationFn: async (patch: UpdateProfileDto) => {
      const saved = (await auth.accountControllerUpdateProfile(patch)).data as MyProfileDto;
      // Tên hiển thị đổi thì header, cột trái cập nhật theo.
      if (patch.displayName !== undefined) await session.reloadUser();
      return saved;
    },
    onSuccess: (saved) => {
      client.setQueryData(['account', 'me', userId], saved);
      setDraft(null);
    },
  });
  const fieldErrors = readFieldErrors(save.error);
  const update = (name: FieldName, value: string) =>
    setDraft((current) => (current ? { ...current, [name]: value } : current));

  if (profile.isPending)
    return (
      <section className="profile-card" aria-busy="true">
        <output className="auth-hint">{vi.api.loading}</output>
      </section>
    );
  if (!profile.data)
    return (
      <section className="profile-card">
        <ApiErrorNotice error={profile.error} retry={() => void profile.refetch()} />
      </section>
    );
  const data = profile.data;

  const submit = () => {
    if (!draft) return;
    const before = toDraft(data);
    const patch = Object.fromEntries(
      (Object.keys(draft) as FieldName[])
        .filter((name) => draft[name].trim() !== before[name].trim())
        .map((name) => [name, name === 'displayName' ? draft[name].trim() : draft[name].trim() || null]),
    ) as UpdateProfileDto;
    if (Object.keys(patch).length === 0) {
      setDraft(null);
      return;
    }
    save.mutate(patch);
  };

  return (
    <section className="profile-card" aria-labelledby="profile-info-title">
      <header className="profile-card-header">
        <div>
          <h2 id="profile-info-title">{vi.api.profileInfoTitle}</h2>
          <p className="auth-hint">{vi.api.profileInfoHint}</p>
        </div>
        {!isEditing && (
          <button
            type="button"
            className="primary-button profile-edit"
            onClick={() => {
              save.reset();
              setDraft(toDraft(data));
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
              <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
              <path d="m14 6 4 4" />
            </svg>
            {vi.api.profileEdit}
          </button>
        )}
      </header>

      <form
        className={isEditing ? 'profile-fields is-editing' : 'profile-fields'}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <ProfileField
          id="profile-display-name"
          label={vi.api.displayName}
          error={fieldErrors.displayName}
          value={data.displayName}
        >
          {isEditing && (
            <input
              id="profile-display-name"
              required
              maxLength={50}
              autoComplete="name"
              value={draft.displayName}
              onChange={(event) => update('displayName', event.target.value)}
            />
          )}
        </ProfileField>
        <ProfileField id="profile-phone" label={vi.api.phone} error={fieldErrors.phone} value={data.phone}>
          {isEditing && (
            <input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder={vi.api.phonePlaceholder}
              value={draft.phone}
              onChange={(event) => update('phone', event.target.value)}
            />
          )}
        </ProfileField>
        <ProfileField
          id="profile-dob"
          label={vi.api.dateOfBirth}
          error={fieldErrors.dateOfBirth}
          value={describeDate(data.dateOfBirth)}
        >
          {isEditing && (
            <SoftDatePicker
              id="profile-dob"
              max={TODAY}
              yearRange={[1920, Number(TODAY.slice(0, 4))]}
              value={draft.dateOfBirth}
              onChange={(value) => update('dateOfBirth', value)}
            />
          )}
        </ProfileField>
        <ProfileField
          id="profile-gender"
          label={vi.api.gender}
          error={fieldErrors.gender}
          value={describeGender(data.gender)}
        >
          {isEditing && (
            <SoftSelect
              id="profile-gender"
              value={draft.gender}
              onChange={(value) => update('gender', value)}
              options={[
                { value: '', label: vi.api.genderUnset },
                ...(Object.keys(vi.api.genderOptions) as Gender[]).map((gender) => ({
                  value: gender,
                  label: vi.api.genderOptions[gender],
                })),
              ]}
            />
          )}
        </ProfileField>
        <ProfileField
          id="profile-nationality"
          label={vi.api.nationality}
          error={fieldErrors.nationality}
          value={data.nationality ? describeNationality(data.nationality) : null}
        >
          {isEditing && (
            <SoftSelect
              id="profile-nationality"
              value={draft.nationality}
              onChange={(value) => update('nationality', value)}
              options={[
                { value: '', label: vi.api.nationalityUnset },
                ...NATIONALITIES.map((code) => ({ value: code, label: describeNationality(code) })),
              ]}
            />
          )}
        </ProfileField>
        <div className="profile-field is-locked">
          <span className="profile-field-label">{vi.api.email}</span>
          <span className="profile-field-value">{data.email}</span>
          <svg className="profile-lock" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>

        <p className="profile-note">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
          {vi.api.emailLocked}
        </p>

        {save.error && Object.keys(fieldErrors).length === 0 && <ApiErrorNotice error={save.error} />}
        {save.isSuccess && !isEditing && <output className="auth-success">{vi.api.profileSaved}</output>}
        {isEditing && (
          <div className="profile-actions">
            <button className="primary-button" disabled={save.isPending || !draft.displayName.trim()}>
              {save.isPending ? vi.api.saving : vi.api.save}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={save.isPending}
              onClick={() => {
                save.reset();
                setDraft(null);
              }}
            >
              {vi.api.cancel}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

/** Một ô hồ sơ: khi xem là nhãn + giá trị ("—" nếu trống), khi sửa là nhãn + ô nhập (children). */
function ProfileField({
  id,
  label,
  value,
  error,
  children,
}: {
  id: string;
  label: string;
  value: string | null;
  error?: string;
  children: ReactNode;
}) {
  const errorId = `${id}-error`;
  // Khi chỉ xem, children là false (isEditing && …): hiện giá trị thay cho ô nhập.
  const hasEditor = Boolean(children);
  return (
    <div className={error ? 'profile-field has-error' : 'profile-field'}>
      {hasEditor ? (
        <label className="profile-field-label" htmlFor={id}>
          {label}
        </label>
      ) : (
        <span className="profile-field-label">{label}</span>
      )}
      {hasEditor ? (
        children
      ) : (
        <span className={value ? 'profile-field-value' : 'profile-field-value is-empty'}>
          {value ?? vi.api.profileEmpty}
        </span>
      )}
      {error && (
        <span className="profile-field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
