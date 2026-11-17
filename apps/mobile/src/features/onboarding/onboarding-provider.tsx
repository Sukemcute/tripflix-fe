import * as SecureStore from 'expo-secure-store';
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
import { emptyOnboarding, ONBOARDING_KEY, parseOnboarding, type OnboardingRecord } from './onboarding-model';

async function readRecord() {
  return Platform.OS === 'web'
    ? globalThis.localStorage.getItem(ONBOARDING_KEY)
    : SecureStore.getItemAsync(ONBOARDING_KEY);
}

async function writeRecord(record: OnboardingRecord) {
  const raw = JSON.stringify(record);
  if (Platform.OS === 'web') globalThis.localStorage.setItem(ONBOARDING_KEY, raw);
  else await SecureStore.setItemAsync(ONBOARDING_KEY, raw);
}

type OnboardingContextValue = {
  ready: boolean;
  record: OnboardingRecord;
  storageError: boolean;
  updateDraft: (changes: Partial<Pick<OnboardingRecord, 'interests' | 'pace' | 'step'>>) => void;
  finish: (status: 'skipped' | 'completed') => Promise<boolean>;
  continueOnce: () => void;
};
const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [record, setRecord] = useState(emptyOnboarding);
  const current = useRef(record);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    const lifecycle = new AbortController();
    readRecord()
      .then((raw) => {
        if (lifecycle.signal.aborted) return;
        current.current = parseOnboarding(raw);
        setRecord(current.current);
      })
      .catch(() => {
        if (!lifecycle.signal.aborted) setStorageError(true);
      })
      .finally(() => {
        if (!lifecycle.signal.aborted) setReady(true);
      });
    return () => lifecycle.abort();
  }, []);

  const persist = useCallback((next: OnboardingRecord) => {
    const pending = writes.current.catch(() => undefined).then(() => writeRecord(next));
    writes.current = pending;
    return pending.then(
      () => {
        setStorageError(false);
        return true;
      },
      () => {
        setStorageError(true);
        return false;
      },
    );
  }, []);

  const updateDraft = useCallback(
    (changes: Partial<Pick<OnboardingRecord, 'interests' | 'pace' | 'step'>>) => {
      // Editing preferences later does not turn a returning visitor into a first-time visitor.
      const next: OnboardingRecord = {
        ...current.current,
        ...changes,
        status: current.current.status === 'unseen' ? 'draft' : current.current.status,
      };
      current.current = next;
      setRecord(next);
      void persist(next);
    },
    [persist],
  );

  const finish = useCallback(
    async (status: 'skipped' | 'completed') => {
      const next: OnboardingRecord = { ...current.current, status, step: 'welcome' };
      if (!(await persist(next))) return false;
      current.current = next;
      setRecord(next);
      return true;
    },
    [persist],
  );

  const continueOnce = useCallback(() => {
    // Explicit escape when device storage is unavailable; no saved-success claim.
    current.current = { ...current.current, status: 'skipped' };
    setRecord(current.current);
  }, []);

  return (
    <OnboardingContext.Provider value={{ ready, record, storageError, updateDraft, finish, continueOnce }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('OnboardingProvider is required');
  return context;
}
