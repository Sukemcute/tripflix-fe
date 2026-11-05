import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SessionClient, type SessionOptions, type SessionState } from './session-client';

const SessionContext = createContext<SessionClient | null>(null);
const SERVER_SESSION_STATE: SessionState = { user: null, isReady: false, error: null };
const getServerSnapshot = () => SERVER_SESSION_STATE;

export function ApiSessionProvider({ children, ...options }: SessionOptions & { children: ReactNode }) {
  const [session] = useState(() => new SessionClient(options));
  const queryClient = useQueryClient();
  useEffect(() => {
    // StrictMode mounts effects twice; do not rotate the same refresh token twice.
    session.connectHttp();
    void session.initialize();
    let previousUserId = session.getSnapshot().user?.id;
    return session.subscribe(() => {
      const userId = session.getSnapshot().user?.id;
      if (previousUserId !== userId) queryClient.clear();
      previousUserId = userId;
    });
  }, [session, queryClient]);
  return createElement(SessionContext.Provider, { value: session }, children);
}

export function useApiSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('ApiSessionProvider is required');
  return { ...useSyncExternalStore(session.subscribe, session.getSnapshot, getServerSnapshot), session };
}
