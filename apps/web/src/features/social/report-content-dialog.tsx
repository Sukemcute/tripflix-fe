'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { ApiErrorNotice } from '@/features/shared/api-state';
import styles from './report-content-dialog.module.css';

export function ReportContentDialog({
  targetType,
  targetId,
  onClose,
  onReported,
}: {
  targetType: 'post' | 'comment';
  targetId: string;
  onClose: () => void;
  onReported: () => void;
}) {
  const client = useQueryClient();
  const [reason, setReason] = useState<keyof typeof vi.moderation.reasons | ''>('');
  const [detail, setDetail] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const report = useMutation({
    mutationFn: async () => {
      if (!reason) throw new Error('Chọn lý do báo cáo');
      return moderationApi.report(targetType, targetId, {
        reasonCode: reason,
        reasonDetail: detail.trim() || undefined,
      });
    },
    onSuccess: () => {
      onReported();
      return client.invalidateQueries({ queryKey: ['my-reports'] });
    },
  });
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`} onClose={onClose}>
      <header className={styles.header}>
        <h2 id={`${id}-title`}>Báo cáo {targetType === 'comment' ? 'bình luận' : 'bài viết'}</h2>
        <button
          type="button"
          className={styles.close}
          aria-label="Đóng báo cáo"
          onClick={() => dialog.current?.close()}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div className={styles.content}>
        {report.isSuccess ? (
          <>
            <output className={styles.success}>{vi.moderation.reported}</output>
            <p>
              Bạn có thể theo dõi trong <Link href="/account/moderation">Báo cáo của tôi</Link>.
            </p>
            <button type="button" className="primary-button" onClick={() => dialog.current?.close()}>
              Đóng
            </button>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              report.mutate();
            }}
          >
            <fieldset className={styles.reasons} disabled={report.isPending}>
              <legend>Tại sao bạn báo cáo {targetType === 'comment' ? 'bình luận' : 'bài viết'} này?</legend>
              <p>{vi.moderation.reportHint}</p>
              {Object.entries(vi.moderation.reasons).map(([code, label]) => (
                <label key={code} className={styles.reason}>
                  <span>{label}</span>
                  <input
                    type="radio"
                    name={`${id}-reason`}
                    value={code}
                    required
                    checked={reason === code}
                    onChange={() => setReason(code as typeof reason)}
                  />
                </label>
              ))}
            </fieldset>
            <label className={styles.detailLabel} htmlFor={`${id}-detail`}>
              Mô tả thêm (không bắt buộc)
            </label>
            <textarea
              id={`${id}-detail`}
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              maxLength={500}
              rows={3}
              disabled={report.isPending}
            />
            <ApiErrorNotice error={report.error} />
            <div className={styles.actions}>
              <button type="button" className="secondary-button" onClick={() => dialog.current?.close()}>
                Hủy
              </button>
              <button type="submit" className="primary-button" disabled={report.isPending || !reason}>
                {report.isPending ? 'Đang gửi…' : 'Gửi báo cáo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
