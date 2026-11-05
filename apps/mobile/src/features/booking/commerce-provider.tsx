import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import {
  createCardPaymentOperation,
  createCheckoutOperation,
  createOtpOperation,
  createVnpayOperation,
  useApiSession,
} from '@tripflix/api-client';
import type {
  CheckoutRequestDto,
  PayResultDto,
  StartVnpayResultDto,
} from '@tripflix/api-client/core-api/model/index';

export interface CommerceDraft {
  request: CheckoutRequestDto;
  hotelId: string;
  hotelName: string;
  roomName: string;
  rateName: string;
  total: number;
}
function createOperations(accountId?: string) {
  let create = createCheckoutOperation();
  return {
    accountId,
    create: (request: CheckoutRequestDto) => create(request),
    resetCheckout: () => {
      create = createCheckoutOperation();
    },
    pay: createCardPaymentOperation(),
    otp: createOtpOperation(),
    vnpay: createVnpayOperation(),
    challenges: new Map<string, string>(),
    uncertain: new Set<string>(),
    pendingResults: new Set<string>(),
    retries: new Map<string, () => Promise<PayResultDto | StartVnpayResultDto>>(),
    paymentUrls: new Map<string, string>(),
    cardAttempts: new Map<string, number>(),
  };
}
const CommerceContext = createContext<{
  draft: CommerceDraft | null;
  setDraft: (draft: CommerceDraft) => void;
  operations: ReturnType<typeof createOperations>;
} | null>(null);

export function CommerceProvider({ children }: PropsWithChildren) {
  const { user } = useApiSession();
  const [draft, setDraft] = useState<CommerceDraft | null>(null);
  // Keys belong to the signed-in account, and survive navigation away and back.
  const operations = useMemo(() => createOperations(user?.id), [user?.id]);
  const chooseDraft = (value: CommerceDraft) => {
    operations.resetCheckout();
    setDraft(value);
  };
  return (
    <CommerceContext.Provider value={{ draft, setDraft: chooseDraft, operations }}>
      {children}
    </CommerceContext.Provider>
  );
}
export function useCommerce() {
  const context = useContext(CommerceContext);
  if (!context) throw new Error('CommerceProvider is required');
  return context;
}
