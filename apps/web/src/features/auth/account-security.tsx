'use client';
import { useApiSession } from '@tripflix/api-client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import { t, vi } from '@tripflix/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { AuthErrorNotice, AuthField, PasswordField } from './auth-fields';

/**
 * Tab "Tài khoản": hồ sơ, đổi mật khẩu và các thiết bị đang đăng nhập, mỗi phần một thẻ riêng.
 * Màn rộng: cột trái hồ sơ + thiết bị, cột phải đổi mật khẩu. Màn hẹp: một cột theo thứ tự hồ sơ, mật khẩu, thiết bị.
 */
export function AccountSecurity({ displayName, userId }: { displayName: string; userId: string }) {
  return (
    <div className="account-grid">
      <div className="account-column">
        <ProfilePanel displayName={displayName} />
        <DevicesPanel userId={userId} />
      </div>
      <div className="account-column">
        <PasswordPanel />
      </div>
    </div>
  );
}

function ProfilePanel({ displayName }: { displayName: string }) {
  const { session } = useApiSession();
  const [name, setName] = useState(displayName);
  const save = useMutation({
    mutationFn: async () => {
      await auth.accountControllerUpdateProfile({ displayName: name.trim() });
      await session.reloadUser();
    },
  });
  return (
    <section className="account-panel account-profile">
      <h2>{vi.api.profileSection}</h2>
      <p className="auth-hint">{vi.api.profileHint}</p>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <AuthField
          id="account-display-name"
          label={vi.api.displayName}
          required
          maxLength={50}
          autoComplete="name"
          value={name}
          onValueChange={setName}
        />
        <ApiErrorNotice error={save.error} />
        {save.isSuccess && <output className="auth-success">{vi.api.saved}</output>}
        <button className="primary-button" disabled={save.isPending || !name.trim()}>
          {save.isPending ? vi.api.saving : vi.api.save}
        </button>
      </form>
    </section>
  );
}

function PasswordPanel() {
  const client = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isMismatch, setMismatch] = useState(false);
  const change = useMutation({
    mutationFn: () => auth.accountControllerChangePassword({ currentPassword, newPassword }),
    onSuccess: async () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      // Các thiết bị khác đã bị đăng xuất: tải lại danh sách thiết bị.
      await client.invalidateQueries({ queryKey: ['account'] });
    },
  });
  return (
    <section className="account-panel account-password">
      <h2>{vi.api.changePassword}</h2>
      <p className="auth-hint">{vi.api.changePasswordHint}</p>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          const isSame = newPassword === confirmation;
          setMismatch(!isSame);
          if (isSame) change.mutate();
        }}
      >
        <PasswordField
          id="account-current-password"
          label={vi.api.currentPassword}
          required
          autoComplete="current-password"
          value={currentPassword}
          onValueChange={setCurrentPassword}
        />
        <PasswordField
          id="account-new-password"
          label={vi.api.newPassword}
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onValueChange={setNewPassword}
        />
        <PasswordField
          id="account-confirm-password"
          label={vi.api.confirmPassword}
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmation}
          onValueChange={setConfirmation}
        />
        {isMismatch && (
          <p role="alert" className="auth-error">
            {vi.api.passwordMismatch}
          </p>
        )}
        <AuthErrorNotice error={change.error} action="changePassword" />
        {change.isSuccess && <output className="auth-success">{vi.api.passwordChanged}</output>}
        <button className="primary-button" disabled={change.isPending}>
          {change.isPending ? vi.api.saving : vi.api.changePassword}
        </button>
      </form>
    </section>
  );
}

/** Số thiết bị hiện sẵn (gồm thiết bị hiện tại); còn lại ẩn sau nút "Xem thêm". */
const VISIBLE_DEVICES = 5;

function DevicesPanel({ userId }: { userId: string }) {
  const { session } = useApiSession();
  const client = useQueryClient();
  const [isConfirmingLogoutAll, setConfirmingLogoutAll] = useState(false);
  const [isShowingAllDevices, setShowingAllDevices] = useState(false);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const logoutAllButton = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  // Nút vừa bấm biến mất khi hiện khung hỏi lại: chuyển focus vào khung, huỷ thì trả về nút cũ.
  useEffect(() => {
    if (isConfirmingLogoutAll) confirmButton.current?.focus();
    else if (wasConfirming.current) logoutAllButton.current?.focus();
    wasConfirming.current = isConfirmingLogoutAll;
  }, [isConfirmingLogoutAll]);
  const devices = useQuery({
    queryKey: ['account', 'sessions', userId],
    queryFn: async ({ signal }) => (await auth.accountControllerListSessions({ signal })).data,
  });
  const action = useMutation({
    mutationFn: async (request: 'logout' | 'logoutAll' | { revoke: string }) => {
      if (request === 'logout') await session.logout();
      else if (request === 'logoutAll') await session.logoutAll();
      else {
        await auth.accountControllerRevokeSession(encodeURIComponent(request.revoke));
        // Thoát chính thiết bị này: khởi tạo lại phiên để trang về trạng thái chưa đăng nhập.
        if (devices.data?.find((device) => device.id === request.revoke)?.isCurrent)
          await session.initialize();
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['account'] }),
  });
  // Thiết bị hiện tại đứng đầu, sau đó theo lần hoạt động gần nhất.
  const sortedDevices = [...(devices.data ?? [])].sort(
    (a, b) =>
      Number(b.isCurrent) - Number(a.isCurrent) ||
      new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
  );
  const visibleDevices = isShowingAllDevices ? sortedDevices : sortedDevices.slice(0, VISIBLE_DEVICES);
  const hiddenCount = sortedDevices.length - VISIBLE_DEVICES;
  return (
    <section className="account-panel account-devices">
      <h2>
        {vi.api.sessions}
        {devices.data && (
          <span className="device-count">{t('api.deviceCount', { count: sortedDevices.length })}</span>
        )}
      </h2>
      <p className="auth-hint">{vi.api.devicesHint}</p>
      <ApiErrorNotice
        error={devices.error}
        retry={() => {
          void devices.refetch();
        }}
      />
      <ApiErrorNotice error={action.error} />
      {devices.isPending && <p className="auth-hint">{vi.api.loading}</p>}
      {devices.data?.length === 0 && <p className="auth-hint">{vi.api.noDevices}</p>}
      <ul className="device-list" id="account-device-list">
        {visibleDevices.map((device) => (
          <li key={device.id} className="device-item">
            <div>
              <strong>{device.deviceName ?? vi.api.unknownDevice}</strong>
              {device.isCurrent && <span className="device-badge">{vi.api.currentSession}</span>}
              <p>{t('api.lastActive', { time: new Date(device.lastUsedAt).toLocaleString('vi-VN') })}</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              disabled={action.isPending}
              onClick={() => action.mutate({ revoke: device.id })}
            >
              {vi.api.revoke}
            </button>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          className="device-toggle"
          aria-expanded={isShowingAllDevices}
          aria-controls="account-device-list"
          onClick={() => setShowingAllDevices(!isShowingAllDevices)}
        >
          {isShowingAllDevices ? vi.api.showFewerDevices : t('api.showMoreDevices', { count: hiddenCount })}
        </button>
      )}
      {isConfirmingLogoutAll ? (
        <div className="account-confirm" role="alertdialog" aria-label={vi.api.logoutAllConfirm}>
          <p>{vi.api.logoutAllConfirm}</p>
          <div className="account-actions">
            <button
              ref={confirmButton}
              type="button"
              className="primary-button"
              disabled={action.isPending}
              onClick={() => action.mutate('logoutAll')}
            >
              {vi.api.logoutAllConfirmButton}
            </button>
            <button type="button" className="secondary-button" onClick={() => setConfirmingLogoutAll(false)}>
              {vi.api.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="account-actions">
          <button
            ref={logoutAllButton}
            type="button"
            className="secondary-button"
            disabled={action.isPending}
            onClick={() => setConfirmingLogoutAll(true)}
          >
            {vi.api.logoutAll}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={action.isPending}
            onClick={() => action.mutate('logout')}
          >
            {vi.api.logout}
          </button>
        </div>
      )}
    </section>
  );
}
