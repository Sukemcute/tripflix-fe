'use client';
import { useApiSession } from '@tripflix/api-client';
import type { MyProfileDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  INTEREST_IDS,
  normalizeInterests,
  PACE_IDS,
  type Interest,
  type OnboardingRecord,
  type OnboardingStep,
  type Pace,
  type SurveyStatus,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { withReturnTo } from '../auth/auth-return';
import { ApiErrorNotice } from '../shared/api-state';
import { readSurveyReturn } from './post-auth';
import { saveSurveyToAccount } from './survey-account';
import { readSurveyRecord, writeSurveyRecord } from './survey-storage';

const subscribeNever = () => () => {};
type Outcome = 'saved' | 'local';

/** Nội dung chỉ có ở trình duyệt (localStorage), nên chờ hydrate xong và phiên đăng nhập sẵn sàng rồi mới dựng. */
export function OnboardingFlow({ returnTo, mode }: { returnTo?: string; mode?: string }) {
  const { user, isReady } = useApiSession();
  const isBrowser = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  if (!isBrowser || !isReady)
    return (
      <main id="content" className="ota-container results-page onboarding-page">
        <section className="onboarding-card" aria-busy="true">
          <output>{vi.api.loading}</output>
        </section>
      </main>
    );
  return <Survey key={user?.id ?? 'guest'} returnTo={returnTo} isEdit={mode === 'edit'} />;
}

/** Bản nháp ban đầu: lấy từ máy; tài khoản đã lưu sở thích mà chưa có nháp thì điền sẵn để sửa. */
function startingRecord(user: MyProfileDto | null, isEdit: boolean): OnboardingRecord {
  const local = readSurveyRecord();
  const saved = user?.travelPreferences;
  const resume = local.status === 'draft' ? local.step : 'welcome';
  const step: OnboardingStep = user && resume === 'welcome' ? 'interests' : resume;
  const useSaved = !!saved && local.status !== 'draft' && (isEdit || local.status === 'unseen');
  return { ...local, step, interests: useSaved ? normalizeInterests(saved.interests) : local.interests };
}

function Survey({ returnTo, isEdit }: { returnTo?: string; isEdit: boolean }) {
  const { user, session } = useApiSession();
  const router = useRouter();
  const client = useQueryClient();
  const destination = readSurveyReturn(returnTo);
  const [record, setRecord] = useState(() => startingRecord(user, isEdit));
  const [hasStorageError, setHasStorageError] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const finishedAt = useRef<Date | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { step } = record;

  useEffect(() => headingRef.current?.focus(), [step, outcome]);

  function edit(changes: Partial<Pick<OnboardingRecord, 'interests' | 'pace' | 'step'>>) {
    finishedAt.current = null;
    const next: OnboardingRecord = { ...record, ...changes, status: 'draft' };
    setRecord(next);
    setHasStorageError(!writeSurveyRecord(next));
  }

  /** Ghi kết quả cuối lên máy. Bỏ qua thì đi tiếp ngay; hoàn tất thì hiện xác nhận trước. */
  function conclude(status: SurveyStatus, at: Date, kind: Outcome) {
    const next: OnboardingRecord = {
      ...record,
      status,
      step: 'welcome',
      ...(status === 'completed' && { completedAt: at.toISOString() }),
    };
    const isWritten = writeSurveyRecord(next);
    setHasStorageError(!isWritten);
    setRecord(next);
    if (status === 'skipped') router.replace(destination);
    else if (isWritten || kind === 'saved') setOutcome(kind);
  }

  const save = useMutation({
    mutationFn: async (status: SurveyStatus): Promise<MyProfileDto | null> => {
      if (!user) return null;
      // Bỏ qua khi hồ sơ đã hoàn tất thì không ghi đè hồ sơ đó.
      if (status === 'skipped' && user.travelPreferences?.status === 'completed') return null;
      finishedAt.current ??= new Date();
      return saveSurveyToAccount(session, record, status, user.travelPreferences, finishedAt.current);
    },
    onSuccess: (me, status) => {
      if (me) client.setQueryData(['account', 'me', me.id], me);
      conclude(status, finishedAt.current ?? new Date(), 'saved');
    },
  });

  function finish(status: SurveyStatus) {
    if (user) save.mutate(status);
    else conclude(status, new Date(), 'local');
  }

  const isSaving = save.isPending;
  const chosenCount = record.interests.length;
  const stepNumber = step === 'interests' ? 1 : step === 'pace' ? 2 : 0;
  const stepLabel = stepNumber
    ? t('api.onboardingStepLabel', { current: stepNumber, total: 2 })
    : vi.api.onboardingReviewTitle;
  const back: OnboardingStep = step === 'review' ? 'pace' : step === 'pace' ? 'interests' : 'welcome';

  function toggleInterest(id: Interest) {
    edit({
      interests: normalizeInterests(
        record.interests.includes(id) ? record.interests.filter((item) => item !== id) : [...record.interests, id],
      ),
    });
  }

  if (outcome)
    return (
      <main id="content" className="ota-container results-page onboarding-page">
        <section className="onboarding-card" aria-labelledby="onboarding-heading">
          <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1}>
            {outcome === 'saved' ? vi.api.travelSaved : vi.api.onboardingLocalSaved}
          </h1>
          <div className="onboarding-actions">
            <Link prefetch={false} className="primary-button" href={destination}>
              {vi.api.onboardingNext}
            </Link>
            {outcome === 'local' && (
              <>
                <Link
                  prefetch={false}
                  className="secondary-button"
                  href={withReturnTo('/login', destination === '/' ? undefined : destination)}
                >
                  {vi.api.login}
                </Link>
                <Link
                  prefetch={false}
                  className="secondary-button"
                  href={withReturnTo('/register', destination === '/' ? undefined : destination)}
                >
                  {vi.api.register}
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    );

  return (
    <main id="content" className="ota-container results-page onboarding-page">
      <section className="onboarding-card" aria-labelledby="onboarding-heading">
        <div className="onboarding-top">
          {step === 'welcome' ? (
            <span />
          ) : (
            <button
              type="button"
              className="auth-text-button"
              disabled={isSaving}
              onClick={() => edit({ step: back })}
            >
              ← {vi.api.onboardingBack}
            </button>
          )}
          <button type="button" className="auth-text-button" disabled={isSaving} onClick={() => finish('skipped')}>
            {vi.api.onboardingSkip}
          </button>
        </div>

        {step !== 'welcome' && (
          <div className="onboarding-progress">
            <div className="onboarding-progress-bar" aria-hidden="true">
              <span className="is-filled" />
              <span className={step === 'interests' ? '' : 'is-filled'} />
              <span className={step === 'review' ? 'is-filled' : ''} />
            </div>
            <progress className="onboarding-visually-hidden" value={stepNumber} max={2} aria-label={stepLabel} />
            <span className="onboarding-step-label">{stepLabel}</span>
          </div>
        )}

        {step === 'welcome' && (
          <>
            <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1}>
              {vi.api.onboardingWelcomeTitle}
            </h1>
            <p className="onboarding-lead">{vi.api.onboardingWelcomeBody}</p>
            <div className="onboarding-actions">
              <button type="button" className="primary-button" onClick={() => edit({ step: 'interests' })}>
                {vi.api.onboardingStart}
              </button>
            </div>
          </>
        )}

        {step === 'interests' && (
          <fieldset className="onboarding-fieldset" aria-describedby="onboarding-count">
            <legend>
              <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1}>
                {vi.api.onboardingInterestsTitle}
              </h1>
              <span className="onboarding-lead">{vi.api.onboardingInterestsBody}</span>
            </legend>
            <ul className="onboarding-options">
              {INTEREST_IDS.map((id) => {
                const isSelected = record.interests.includes(id);
                return (
                  <li key={id}>
                    <label className={isSelected ? 'onboarding-option is-selected' : 'onboarding-option'}>
                      <input
                        type="checkbox"
                        className="onboarding-input"
                        checked={isSelected}
                        onChange={() => toggleInterest(id)}
                      />
                      <span className="onboarding-option-body">
                        <span className="onboarding-option-title">{vi.api.travelInterestOptions[id]}</span>
                        <span className="onboarding-option-detail">{vi.api.onboardingInterestDetails[id]}</span>
                      </span>
                      <span className="onboarding-mark" aria-hidden="true">
                        {isSelected ? `✓ ${vi.api.onboardingSelected}` : ''}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p id="onboarding-count" className="auth-hint" aria-live="polite">
              {chosenCount
                ? t('api.onboardingSelectedCount', { count: chosenCount })
                : vi.api.onboardingSelectAtLeastOne}
            </p>
            <div className="onboarding-actions">
              <button
                type="button"
                className="primary-button"
                disabled={!chosenCount}
                onClick={() => edit({ step: 'pace' })}
              >
                {vi.api.onboardingNext}
              </button>
            </div>
          </fieldset>
        )}

        {step === 'pace' && (
          <fieldset className="onboarding-fieldset">
            <legend>
              <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1}>
                {vi.api.onboardingPaceTitle}
              </h1>
              <span className="onboarding-lead">{vi.api.onboardingPaceBody}</span>
            </legend>
            <ul className="onboarding-options">
              {PACE_IDS.map((id: Pace) => {
                const isSelected = record.pace === id;
                const option = vi.api.onboardingPaceOptions[id];
                return (
                  <li key={id}>
                    <label className={isSelected ? 'onboarding-option is-selected' : 'onboarding-option'}>
                      <input
                        type="radio"
                        name="onboarding-pace"
                        className="onboarding-input"
                        checked={isSelected}
                        onChange={() => edit({ pace: id })}
                      />
                      <span className="onboarding-option-body">
                        <span className="onboarding-option-title">{option.title}</span>
                        <span className="onboarding-option-detail">{option.detail}</span>
                      </span>
                      <span className="onboarding-mark" aria-hidden="true">
                        {isSelected ? `✓ ${vi.api.onboardingSelected}` : ''}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="auth-hint">{vi.api.onboardingPaceDeviceOnly}</p>
            <div className="onboarding-actions">
              <button type="button" className="primary-button" onClick={() => edit({ step: 'review' })}>
                {vi.api.onboardingNext}
              </button>
              <button type="button" className="secondary-button" onClick={() => edit({ pace: null, step: 'review' })}>
                {vi.api.onboardingSkipQuestion}
              </button>
            </div>
          </fieldset>
        )}

        {step === 'review' && (
          <>
            <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1}>
              {vi.api.onboardingReviewTitle}
            </h1>
            <dl className="onboarding-summary">
              <div>
                <dt>{vi.api.onboardingReviewInterests}</dt>
                <dd>
                  {record.interests.map((id) => vi.api.travelInterestOptions[id]).join(' · ') ||
                    vi.api.onboardingNone}
                </dd>
                <button type="button" className="auth-text-button is-accent" onClick={() => edit({ step: 'interests' })}>
                  {vi.api.onboardingEdit}
                </button>
              </div>
              <div>
                <dt>{vi.api.onboardingReviewPace}</dt>
                <dd>{record.pace ? vi.api.onboardingPaceOptions[record.pace].title : vi.api.onboardingNone}</dd>
                <button type="button" className="auth-text-button is-accent" onClick={() => edit({ step: 'pace' })}>
                  {vi.api.onboardingEdit}
                </button>
              </div>
            </dl>
            {!user && <p className="auth-hint">{vi.api.onboardingGuestNote}</p>}
            {save.isError && <p role="alert" className="auth-error">{vi.api.onboardingSaveFailed}</p>}
            <ApiErrorNotice error={save.error} retry={() => save.variables && save.mutate(save.variables)} />
            {hasStorageError && <p role="alert" className="auth-error">{vi.api.onboardingStorageError}</p>}
            <div className="onboarding-actions">
              <button
                type="button"
                className="primary-button"
                disabled={isSaving}
                aria-busy={isSaving}
                onClick={() => finish(record.interests.length ? 'completed' : 'skipped')}
              >
                {isSaving ? vi.api.saving : vi.api.onboardingSave}
              </button>
            </div>
          </>
        )}
        {step !== 'review' && hasStorageError && <p role="alert" className="auth-error">{vi.api.onboardingStorageError}</p>}
      </section>
    </main>
  );
}
