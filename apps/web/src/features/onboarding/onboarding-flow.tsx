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
import Image, { getImageProps } from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { preload } from 'react-dom';
import { withReturnTo } from '../auth/auth-return';
import { TripiMascot } from '../mascot/tripi-mascot';
import { TRIPI_ASSETS, type TripiAnimation, type TripiPose } from '../mascot/tripi-assets';
import styles from './onboarding.module.css';
import { readSurveyReturn } from './post-auth';
import { saveSurveyToAccount } from './survey-account';
import { readSurveyRecord, writeSurveyRecord } from './survey-storage';
import { LoadingDots } from '@/features/shared/loading-dots';

const subscribeNever = () => () => {};
type Outcome = 'saved' | 'local';
type Direction = 'forward' | 'back';

/** Ảnh thật cho từng sở thích (có sẵn trong public/brand). */
const INTEREST_PHOTOS: Record<Interest, string> = {
  coast: '/brand/destinations/phu-quoc-spotlight.jpg',
  nature: '/brand/home-stays-ninh-binh.jpg',
  culture: '/brand/destinations/hoi-an-experience.jpg',
  food: '/brand/destinations/da-lat-cafe.webp',
  city: '/brand/destinations/ho-chi-minh-experience.jpg',
  stays: '/brand/hotel.jpg',
};
/** Tripi đổi dáng theo sở thích vừa chọn và theo nhịp đi. */
const INTEREST_POSES: Record<Interest, TripiPose> = {
  coast: 'action-vacation',
  nature: 'action-explore',
  culture: 'expr-curious',
  food: 'expr-happy',
  city: 'expr-excited',
  stays: 'expr-relaxed',
};
const PACE_POSES: Record<Pace, TripiPose> = {
  slow: 'expr-relaxed',
  balanced: 'expr-happy',
  active: 'action-explore',
};
/**
 * Dáng tĩnh Tripi dùng trong khảo sát. Ảnh gốc 1–2MB nên vẫn qua bộ tối ưu của next/image; tải sẵn đúng URL đã tối ưu
 * (cùng kích thước TripiMascot dùng) để đổi dáng không bị trống. Ảnh động nặng chỉ dùng ở màn chào và màn hoàn tất.
 */
const MASCOT_SIZE = 300;
const SURVEY_POSES: TripiPose[] = [
  ...new Set<TripiPose>([
    ...Object.values(INTEREST_POSES),
    ...Object.values(PACE_POSES),
    'expr-curious',
    'action-depart',
    'expr-confident',
    'expr-effort',
    'expr-surprised',
    'expr-cheer',
  ]),
];
function preloadSurveyPoses() {
  for (const pose of SURVEY_POSES) {
    const { props } = getImageProps({
      src: TRIPI_ASSETS[pose].src,
      alt: '',
      width: MASCOT_SIZE,
      height: MASCOT_SIZE,
    });
    preload(props.src, { as: 'image', imageSrcSet: props.srcSet, fetchPriority: 'low' });
  }
}

/** Confetti cố định (không random lúc render): vị trí %, độ trễ ms, góc xoay, màu token. */
const CONFETTI_COLORS = [
  'var(--color-coral)',
  'var(--color-sun)',
  'var(--color-teal)',
  'var(--color-coral-soft)',
];
const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  x: (index * 37) % 100,
  d: (index * 53) % 600,
  r: ((index * 97) % 720) - 360,
  c: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
}));

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
      <main id="content" data-onboarding-page className={styles.page}>
        <TopBar />
        <div className={styles.layout} aria-busy="true">
          <LoadingDots isBlock />
        </div>
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

function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.topbar}>
      <Link prefetch={false} href="/" className={styles.brand} aria-label={vi.api.onboardingHome}>
        <Image src="/brand/tripflix-logo.svg" alt="" width={132} height={39} loading="eager" />
      </Link>
      {children}
    </header>
  );
}

/** Tô nổi một cụm chữ trong tiêu đề; tên truy cập của tiêu đề vẫn là cả câu. */
function Accented({ text, accent }: { text: string; accent: string }) {
  const at = text.indexOf(accent);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className={styles.accent}>{accent}</span>
      {text.slice(at + accent.length)}
    </>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
function ArrowIcon({ isBack = false }: { isBack?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.arrow}
    >
      <path d={isBack ? 'M19 12H5m6-6-6 6 6 6' : 'M5 12h14m-6-6 6 6-6 6'} />
    </svg>
  );
}

/** Tripi kèm bong bóng thoại; đổi key để chạy lại hiệu ứng mỗi khi dáng hoặc lời nói đổi. */
function TripiStage({
  pose,
  animation,
  line,
}: {
  pose?: TripiPose;
  animation?: TripiAnimation;
  line: string;
}) {
  return (
    <aside className={styles.stage}>
      <p key={line} className={styles.bubble} aria-live="polite">
        <span className={styles.bubbleName}>{vi.api.onboardingTripiName}</span>
        {line}
      </p>
      <div className={styles.mascotWrap}>
        <div key={animation ?? pose} className={styles.mascot}>
          <TripiMascot pose={pose} animation={animation} size={MASCOT_SIZE} alt="" />
        </div>
      </div>
    </aside>
  );
}

function Survey({ returnTo, isEdit }: { returnTo?: string; isEdit: boolean }) {
  const { user, session } = useApiSession();
  const router = useRouter();
  const client = useQueryClient();
  const destination = readSurveyReturn(returnTo);
  const [record, setRecord] = useState(() => startingRecord(user, isEdit));
  const [hasStorageError, setHasStorageError] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [direction, setDirection] = useState<Direction>('forward');
  const [lastInterest, setLastInterest] = useState<Interest | null>(null);
  const finishedAt = useRef<Date | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { step } = record;
  preloadSurveyPoses();

  useEffect(() => headingRef.current?.focus(), [step, outcome]);

  function edit(changes: Partial<Pick<OnboardingRecord, 'interests' | 'pace' | 'step'>>) {
    finishedAt.current = null;
    const next: OnboardingRecord = { ...record, ...changes, status: 'draft' };
    setRecord(next);
    setHasStorageError(!writeSurveyRecord(next));
  }
  function goTo(next: OnboardingStep, way: Direction) {
    setDirection(way);
    edit({ step: next });
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
  const says = vi.api.onboardingTripiSays;

  function toggleInterest(id: Interest) {
    const isAdding = !record.interests.includes(id);
    setLastInterest(isAdding ? id : null);
    edit({
      interests: normalizeInterests(
        isAdding ? [...record.interests, id] : record.interests.filter((item) => item !== id),
      ),
    });
  }

  // Tripi nói gì, đứng dáng nào ở mỗi thời điểm.
  const tripi: { pose?: TripiPose; animation?: TripiAnimation; line: string } = outcome
    ? outcome === 'saved'
      ? { animation: 'success', line: says.saved }
      : { pose: 'expr-cheer', line: says.local }
    : isSaving
      ? { pose: 'expr-effort', line: says.saving }
      : save.isError
        ? { pose: 'expr-surprised', line: says.error }
        : step === 'welcome'
          ? { animation: 'greeting', line: says.welcome }
          : step === 'interests'
            ? lastInterest && record.interests.includes(lastInterest)
              ? { pose: INTEREST_POSES[lastInterest], line: vi.api.onboardingTripiInterest[lastInterest] }
              : { pose: 'expr-curious', line: says.interests }
            : step === 'pace'
              ? record.pace
                ? { pose: PACE_POSES[record.pace], line: vi.api.onboardingTripiPace[record.pace] }
                : { pose: 'action-depart', line: says.pace }
              : { pose: 'expr-confident', line: says.review };

  if (outcome)
    return (
      <main id="content" data-onboarding-page className={styles.page}>
        <div className={styles.confetti} aria-hidden="true">
          {CONFETTI.map((piece, index) => (
            <span
              key={index}
              style={{ '--x': piece.x, '--d': piece.d, '--r': piece.r, '--c': piece.c } as CSSProperties}
            />
          ))}
        </div>
        <TopBar />
        <div className={styles.layout}>
          <TripiStage {...tripi} />
          <section
            className={`${styles.panel} ${styles.done} ${styles.stepForward}`}
            aria-labelledby="onboarding-heading"
          >
            <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
              {outcome === 'saved' ? vi.api.travelSaved : vi.api.onboardingLocalSaved}
            </h1>
            {record.interests.length > 0 && (
              <ul className={styles.chips} aria-label={vi.api.onboardingReviewInterests}>
                {record.interests.map((id, index) => (
                  <li key={id} className={styles.chip} style={{ '--i': index } as CSSProperties}>
                    <Image
                      src={INTEREST_PHOTOS[id]}
                      alt=""
                      width={32}
                      height={32}
                      className={styles.chipPhoto}
                    />
                    {vi.api.travelInterestOptions[id]}
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.actions}>
              <Link prefetch={false} className={styles.primary} href={destination}>
                {vi.api.onboardingNext}
                <ArrowIcon />
              </Link>
              {outcome === 'local' && (
                <>
                  <Link
                    prefetch={false}
                    className={styles.secondary}
                    href={withReturnTo('/login', destination === '/' ? undefined : destination)}
                  >
                    {vi.api.login}
                  </Link>
                  <Link
                    prefetch={false}
                    className={styles.secondary}
                    href={withReturnTo('/register', destination === '/' ? undefined : destination)}
                  >
                    {vi.api.register}
                  </Link>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    );

  return (
    <main id="content" data-onboarding-page className={styles.page}>
      <span className={`${styles.blob} ${styles.blobSun}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.blobTeal}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.blobCoral}`} aria-hidden="true" />
      <TopBar>
        <div className={styles.progress}>
          {step !== 'welcome' && (
            <>
              <div className={styles.progressTrack} aria-hidden="true">
                <span className={styles.isFilled} />
                <span className={step === 'interests' ? '' : styles.isFilled} />
                <span className={step === 'review' ? styles.isFilled : ''} />
              </div>
              <progress className={styles.visuallyHidden} value={stepNumber} max={2} aria-label={stepLabel} />
              <span className={styles.stepLabel}>{stepLabel}</span>
            </>
          )}
        </div>
        <button type="button" className={styles.skip} disabled={isSaving} onClick={() => finish('skipped')}>
          {vi.api.onboardingSkip}
        </button>
      </TopBar>

      <div className={styles.layout}>
        <TripiStage {...tripi} />

        <section
          key={step}
          className={`${styles.panel} ${direction === 'forward' ? styles.stepForward : styles.stepBack}`}
          aria-labelledby="onboarding-heading"
        >
          {step === 'welcome' && (
            <>
              <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
                <Accented text={vi.api.onboardingWelcomeTitle} accent={vi.api.onboardingWelcomeAccent} />
              </h1>
              <p className={styles.lead}>{vi.api.onboardingWelcomeBody}</p>
              <div className={styles.polaroids} aria-hidden="true">
                {(['coast', 'culture', 'nature', 'city'] as const).map((id, index) => (
                  <span key={id} className={styles.polaroid} style={{ '--i': index } as CSSProperties}>
                    <Image src={INTEREST_PHOTOS[id]} alt="" fill sizes="140px" className={styles.photo} />
                  </span>
                ))}
              </div>
              <p className={styles.note}>
                <CheckIcon />
                {vi.api.onboardingWelcomeNote}
              </p>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => goTo('interests', 'forward')}>
                  {vi.api.onboardingStart}
                  <ArrowIcon />
                </button>
              </div>
            </>
          )}

          {step === 'interests' && (
            <fieldset className={styles.fieldset} aria-describedby="onboarding-count">
              <legend>
                <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
                  <Accented
                    text={vi.api.onboardingInterestsTitle}
                    accent={vi.api.onboardingInterestsAccent}
                  />
                </h1>
                <span className={styles.lead}>{vi.api.onboardingInterestsBody}</span>
              </legend>
              <ul className={styles.interestGrid}>
                {INTEREST_IDS.map((id, index) => {
                  const isSelected = record.interests.includes(id);
                  return (
                    <li key={id} style={{ '--i': index } as CSSProperties}>
                      <label className={`${styles.photoCard} ${isSelected ? styles.isSelected : ''}`}>
                        <input
                          type="checkbox"
                          className={styles.input}
                          checked={isSelected}
                          onChange={() => toggleInterest(id)}
                        />
                        <Image
                          src={INTEREST_PHOTOS[id]}
                          alt=""
                          fill
                          sizes="(max-width: 960px) 45vw, 220px"
                          className={styles.photo}
                        />
                        <span className={styles.photoShade} aria-hidden="true" />
                        <span className={styles.photoText}>
                          <span className={styles.photoTitle}>{vi.api.travelInterestOptions[id]}</span>
                          <span className={styles.photoDetail}>{vi.api.onboardingInterestDetails[id]}</span>
                        </span>
                        <span className={styles.check} aria-hidden="true">
                          <span className={styles.checkDot}>{isSelected && <CheckIcon />}</span>
                          {isSelected && vi.api.onboardingSelected}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p id="onboarding-count" className={styles.count} aria-live="polite">
                {chosenCount ? (
                  <span className={styles.countStrong}>
                    {t('api.onboardingSelectedCount', { count: chosenCount })}
                  </span>
                ) : (
                  vi.api.onboardingSelectAtLeastOne
                )}
              </p>
              <div className={styles.actions}>
                <button type="button" className={styles.ghost} onClick={() => goTo(back, 'back')}>
                  <ArrowIcon isBack />
                  {vi.api.onboardingBack}
                </button>
                <span className={styles.spacer} />
                <button
                  type="button"
                  className={styles.primary}
                  disabled={!chosenCount}
                  onClick={() => goTo('pace', 'forward')}
                >
                  {vi.api.onboardingNext}
                  <ArrowIcon />
                </button>
              </div>
            </fieldset>
          )}

          {step === 'pace' && (
            <fieldset className={styles.fieldset}>
              <legend>
                <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
                  <Accented text={vi.api.onboardingPaceTitle} accent={vi.api.onboardingPaceAccent} />
                </h1>
                <span className={styles.lead}>{vi.api.onboardingPaceBody}</span>
              </legend>
              <ul className={styles.paceGrid}>
                {PACE_IDS.map((id, index) => {
                  const isSelected = record.pace === id;
                  const option = vi.api.onboardingPaceOptions[id];
                  return (
                    <li key={id} style={{ '--i': index } as CSSProperties}>
                      <label className={`${styles.paceCard} ${isSelected ? styles.isSelected : ''}`}>
                        <input
                          type="radio"
                          name="onboarding-pace"
                          className={styles.input}
                          checked={isSelected}
                          onChange={() => edit({ pace: id })}
                        />
                        <Image
                          src={TRIPI_ASSETS[PACE_POSES[id]].src}
                          alt=""
                          width={96}
                          height={96}
                          className={styles.paceArt}
                        />
                        <span className={styles.paceTitle}>{option.title}</span>
                        <span className={styles.paceDetail}>{option.detail}</span>
                        <span className={styles.paceTick} aria-hidden="true">
                          {isSelected && (
                            <>
                              <CheckIcon />
                              {vi.api.onboardingSelected}
                            </>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className={styles.hint}>{vi.api.onboardingPaceDeviceOnly}</p>
              <div className={styles.actions}>
                <button type="button" className={styles.ghost} onClick={() => goTo(back, 'back')}>
                  <ArrowIcon isBack />
                  {vi.api.onboardingBack}
                </button>
                <span className={styles.spacer} />
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    setDirection('forward');
                    edit({ pace: null, step: 'review' });
                  }}
                >
                  {vi.api.onboardingSkipQuestion}
                </button>
                <button type="button" className={styles.primary} onClick={() => goTo('review', 'forward')}>
                  {vi.api.onboardingNext}
                  <ArrowIcon />
                </button>
              </div>
            </fieldset>
          )}

          {step === 'review' && (
            <>
              <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
                <Accented text={vi.api.onboardingReviewTitle} accent={vi.api.onboardingReviewAccent} />
              </h1>
              <dl className={styles.summary}>
                <div className={styles.summaryRow}>
                  <div className={styles.summaryHead}>
                    <dt>{vi.api.onboardingReviewInterests}</dt>
                    <button
                      type="button"
                      className={styles.editLink}
                      onClick={() => goTo('interests', 'back')}
                    >
                      {vi.api.onboardingEdit}
                    </button>
                  </div>
                  <dd>
                    {record.interests.length ? (
                      <ul
                        className={styles.chips}
                        aria-label={record.interests
                          .map((id) => vi.api.travelInterestOptions[id])
                          .join(' · ')}
                      >
                        {record.interests.map((id, index) => (
                          <li key={id} className={styles.chip} style={{ '--i': index } as CSSProperties}>
                            <Image
                              src={INTEREST_PHOTOS[id]}
                              alt=""
                              width={32}
                              height={32}
                              className={styles.chipPhoto}
                            />
                            {vi.api.travelInterestOptions[id]}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className={styles.empty}>{vi.api.onboardingNone}</span>
                    )}
                  </dd>
                </div>
                <div className={styles.summaryRow}>
                  <div className={styles.summaryHead}>
                    <dt>{vi.api.onboardingReviewPace}</dt>
                    <button type="button" className={styles.editLink} onClick={() => goTo('pace', 'back')}>
                      {vi.api.onboardingEdit}
                    </button>
                  </div>
                  <dd className={record.pace ? styles.summaryValue : styles.empty}>
                    {record.pace ? vi.api.onboardingPaceOptions[record.pace].title : vi.api.onboardingNone}
                  </dd>
                </div>
              </dl>
              {!user && <p className={styles.hint}>{vi.api.onboardingGuestNote}</p>}
              {save.isError && (
                <div role="alert" className={styles.errorBox}>
                  <p>{vi.api.onboardingSaveFailed}</p>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => save.variables && save.mutate(save.variables)}
                  >
                    {vi.api.retry}
                  </button>
                </div>
              )}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.ghost}
                  disabled={isSaving}
                  onClick={() => goTo(back, 'back')}
                >
                  <ArrowIcon isBack />
                  {vi.api.onboardingBack}
                </button>
                <span className={styles.spacer} />
                <button
                  type="button"
                  className={styles.primary}
                  disabled={isSaving}
                  aria-busy={isSaving}
                  onClick={() => finish(record.interests.length ? 'completed' : 'skipped')}
                >
                  {isSaving ? vi.api.saving : vi.api.onboardingSave}
                  {!isSaving && <ArrowIcon />}
                </button>
              </div>
            </>
          )}
          {hasStorageError && (
            <p role="alert" className={styles.alert}>
              {vi.api.onboardingStorageError}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
