import * as SecureStore from 'expo-secure-store';
import { useApiSession } from '@tripflix/api-client';
import { accountControllerUpdateProfile } from '@tripflix/api-client/core-api/auth/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';
import {
  emptyOnboarding,
  ONBOARDING_KEY,
  parseOnboarding,
  profilePreferences,
  recordFromProfile,
  type OnboardingRecord,
} from './onboarding-model';

const ACCOUNT_KEY = ONBOARDING_KEY + '.account';
async function readStored(owner: string | null): Promise<OnboardingRecord | undefined> {
  const key = owner ? ACCOUNT_KEY : ONBOARDING_KEY;
  const raw =
    Platform.OS === 'web' ? globalThis.localStorage.getItem(key) : await SecureStore.getItemAsync(key);
  if (!owner) return parseOnboarding(raw);
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw);
    return value.accountId === owner ? parseOnboarding(JSON.stringify(value.record)) : undefined;
  } catch {
    return undefined;
  }
}
async function writeStored(record: OnboardingRecord, owner: string | null) {
  const key = owner ? ACCOUNT_KEY : ONBOARDING_KEY;
  const raw = JSON.stringify(owner ? { accountId: owner, record } : record);
  if (Platform.OS === 'web') globalThis.localStorage.setItem(key, raw);
  else await SecureStore.setItemAsync(key, raw);
}

type OnboardingContextValue = {
  ready: boolean;
  record: OnboardingRecord;
  storageError: boolean;
  accountError: boolean;
  isAccount: boolean;
  dismissedAccount: string | null;
  startForAccount: () => void;
  updateDraft: (changes: Partial<Pick<OnboardingRecord, 'interests' | 'pace' | 'step'>>) => void;
  finish: (status: 'skipped' | 'completed') => Promise<boolean>;
  continueOnce: () => void;
};
const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const { user, session } = useApiSession();
  const owner = user?.id ?? null;
  const [record, setRecord] = useState(emptyOnboarding);
  const current = useRef(record);
  const [loadedOwner, setLoadedOwner] = useState<string | null>();
  const [storageError, setStorageError] = useState(false);
  const [accountError, setAccountError] = useState(false);
  const [dismissedAccount, setDismissedAccount] = useState<string | null>(null);
  const writes = useRef(Promise.resolve());
  const revision = useRef(0);

  useEffect(() => {
    const lifecycle = new AbortController();
    const version = ++revision.current;
    writes.current
      .catch(() => undefined)
      .then(() => readStored(owner))
      .then((cached) => {
        if (lifecycle.signal.aborted || version !== revision.current) return;
        const profile = session.getSnapshot().user;
        const next =
          owner && profile?.id === owner
            ? recordFromProfile(profile.travelPreferences, cached)
            : (cached ?? emptyOnboarding());
        current.current = next;
        setRecord(next);
        setStorageError(false);
      })
      .catch(() => {
        if (lifecycle.signal.aborted || version !== revision.current) return;
        const profile = session.getSnapshot().user;
        const next =
          owner && profile?.id === owner ? recordFromProfile(profile.travelPreferences) : emptyOnboarding();
        current.current = next;
        setRecord(next);
        setStorageError(true);
      })
      .finally(() => {
        if (!lifecycle.signal.aborted && version === revision.current) {
          setLoadedOwner(owner);
          setAccountError(false);
        }
      });
    return () => lifecycle.abort();
  }, [owner, session]);

  const persist = useCallback(
    (next: OnboardingRecord, accountId: string | null) => {
      const pending = writes.current.catch(() => undefined).then(() => writeStored(next, accountId));
      writes.current = pending;
      return pending.then(
        () => {
          if ((session.getSnapshot().user?.id ?? null) === accountId) setStorageError(false);
          return true;
        },
        () => {
          if ((session.getSnapshot().user?.id ?? null) === accountId) setStorageError(true);
          return false;
        },
      );
    },
    [session],
  );

  const updateDraft = useCallback(
    (changes: Partial<Pick<OnboardingRecord, 'interests' | 'pace' | 'step'>>) => {
      ++revision.current;
      const next: OnboardingRecord = {
        ...current.current,
        ...changes,
        status: current.current.status === 'unseen' ? 'draft' : current.current.status,
      };
      current.current = next;
      setRecord(next);
      void persist(next, session.getSnapshot().user?.id ?? null);
    },
    [persist, session],
  );

  const startForAccount = useCallback(() => {
    const profile = session.getSnapshot().user;
    if (!profile) return;
    ++revision.current;
    const next: OnboardingRecord = {
      ...recordFromProfile(profile.travelPreferences),
      status: 'draft',
      step: 'interests',
    };
    current.current = next;
    setRecord(next);
    setLoadedOwner(profile.id);
    setDismissedAccount(null);
    setAccountError(false);
    void persist(next, profile.id);
  }, [persist, session]);

  const finish = useCallback(
    async (status: 'skipped' | 'completed') => {
      const profile = session.getSnapshot().user;
      let next: OnboardingRecord = { ...current.current, status, step: 'welcome' };
      setAccountError(false);
      if (profile) {
        try {
          // Skipping an edit must not erase a previously completed account profile.
          if (status !== 'skipped' || profile.travelPreferences?.status !== 'completed') {
            await accountControllerUpdateProfile({
              travelPreferences: profilePreferences(next, status, profile.travelPreferences),
            });
          }
          const latest = await session.reloadUser();
          if (latest.id !== profile.id || session.getSnapshot().user?.id !== profile.id) return false;
          if (!latest.travelPreferences) throw new Error('Preference save was not confirmed');
          if (status === 'completed' && latest.travelPreferences.status !== 'completed')
            throw new Error('Survey completion was not confirmed');
          next = recordFromProfile(latest.travelPreferences, next);
          next.step = 'welcome';
        } catch {
          if (session.getSnapshot().user?.id === profile.id) setAccountError(true);
          return false;
        }
        await persist(next, profile.id);
        setDismissedAccount(profile.id);
      } else if (!(await persist(next, null))) return false;
      if ((session.getSnapshot().user?.id ?? null) !== (profile?.id ?? null)) return false;
      ++revision.current;
      current.current = next;
      setRecord(next);
      return true;
    },
    [persist, session],
  );

  const continueOnce = useCallback(() => {
    const accountId = session.getSnapshot().user?.id ?? null;
    setDismissedAccount(accountId);
    current.current = { ...current.current, status: 'skipped' };
    setRecord(current.current);
  }, [session]);

  return (
    <OnboardingContext.Provider
      value={{
        ready: loadedOwner === owner,
        record,
        storageError,
        accountError,
        isAccount: !!user,
        dismissedAccount,
        updateDraft,
        finish,
        continueOnce,
        startForAccount,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('OnboardingProvider is required');
  return context;
}
