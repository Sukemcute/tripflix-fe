import { calculateTripQuote, shiftTripDate, type TripSelection } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import type { ImageSource } from 'expo-image';
import { router, type Href } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState, type PropsWithChildren } from 'react';

export type GatedAction = 'save' | 'like' | 'create' | 'checkout';
export interface ReviewMedia {
  source: ImageSource;
  type: 'image' | 'video';
  fileName?: string | null;
  durationMs?: number;
}
export interface ReviewOrder extends TripSelection {
  total: number;
  rooms: number;
  name: string;
  email: string;
  phone: string;
  payment: 'wallet' | 'card';
}

function getLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function useReviewState() {
  const [selection, setSelection] = useState<TripSelection>(() => ({
    date: shiftTripDate(getLocalDate(), 16),
    guests: 2,
    hasFlight: true,
  }));
  const [isSignedIn, setSignedIn] = useState(false);
  const [isSaved, setSaved] = useState(false);
  const [isLiked, setLiked] = useState(false);
  const [query, setQuery] = useState<string>(vi.mobile.explore.defaultQuery);
  const [order, setOrder] = useState<ReviewOrder | null>(null);
  const [contact, setContact] = useState({ name: '', email: '', phone: '', hasConsent: false });
  const [payment, setPayment] = useState<'wallet' | 'card'>('wallet');
  const [story, setStory] = useState('');
  const [media, setMedia] = useState<ReviewMedia[]>([]);
  const [isCompletedTrip, setCompletedTrip] = useState(true);
  const [isPostPending, setPostPending] = useState(false);
  const pendingAction = useRef<{ action: GatedAction; returnTo: Href } | null>(null);
  const isConfirming = useRef(false);

  function runAction(action: GatedAction) {
    if (action === 'save') setSaved((saved) => !saved);
    else if (action === 'like') setLiked((liked) => !liked);
    else {
      if (action === 'checkout') isConfirming.current = false;
      router.push(action === 'create' ? '/create' : '/checkout');
    }
  }

  function requireAccount(action: GatedAction, returnTo: Href) {
    if (isSignedIn) runAction(action);
    else {
      pendingAction.current = { action, returnTo };
      router.push('/login');
    }
  }

  function finishSignIn(fallback: Href = '/(tabs)/me') {
    setSignedIn(true);
    const pending = pendingAction.current;
    pendingAction.current = null;
    if (pending?.action === 'checkout') isConfirming.current = false;
    if (!pending) {
      isConfirming.current = false;
      return router.replace(fallback);
    }
    if (pending.action === 'save') setSaved((saved) => !saved);
    if (pending.action === 'like') setLiked((liked) => !liked);
    router.replace(
      pending.action === 'checkout'
        ? '/checkout'
        : pending.action === 'create'
          ? '/create'
          : pending.returnTo,
    );
  }

  const clearPendingAction = useCallback(() => {
    pendingAction.current = null;
  }, []);

  function confirmOrder(): boolean {
    // UI review only: production confirmation and idempotency belong to the API.
    if (isConfirming.current) return false;
    isConfirming.current = true;
    const quote = calculateTripQuote(selection);
    setOrder({
      ...selection,
      total: quote.total,
      rooms: quote.rooms,
      name: contact.name.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
      payment,
    });
    return true;
  }

  function signOut() {
    setSignedIn(false);
    setSaved(false);
    setLiked(false);
    setOrder(null);
    setContact({ name: '', email: '', phone: '', hasConsent: false });
    setMedia([]);
    setStory('');
    setPostPending(false);
    pendingAction.current = null;
    router.replace('/(tabs)/me');
  }

  return {
    selection,
    setSelection,
    isSignedIn,
    isSaved,
    isLiked,
    query,
    setQuery,
    order,
    contact,
    setContact,
    payment,
    setPayment,
    story,
    setStory,
    media,
    setMedia,
    isCompletedTrip,
    setCompletedTrip,
    isPostPending,
    setPostPending,
    requireAccount,
    finishSignIn,
    clearPendingAction,
    confirmOrder,
    signOut,
    today: getLocalDate(),
  };
}

type ReviewState = ReturnType<typeof useReviewState>;
const ReviewContext = createContext<ReviewState | null>(null);

export function ReviewProvider({ children }: PropsWithChildren) {
  const review = useReviewState();
  return <ReviewContext.Provider value={review}>{children}</ReviewContext.Provider>;
}

export function useReview(): ReviewState {
  const review = useContext(ReviewContext);
  if (!review) throw new Error('ReviewProvider is required');
  return review;
}
