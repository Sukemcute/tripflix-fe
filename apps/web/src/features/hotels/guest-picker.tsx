'use client';
import { vi } from '@tripflix/i18n';
import { useId, useRef, useState } from 'react';
import styles from './hotel.module.css';
import { placeBelow, useCloseOnScroll } from '@/features/shared/soft-select';

const copy = vi.hotel;
const MAX_GUESTS = 9;

interface Guests {
  adults: number;
  children: number;
  infants: number;
}

function CountRow({
  label,
  hint,
  value,
  canDecrease,
  canIncrease,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.guestRow}>
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className={styles.guestStepper}>
        <button
          type="button"
          aria-label={`${copy.decreaseGuests} ${label}`}
          disabled={!canDecrease}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <output aria-label={label}>{value}</output>
        <button
          type="button"
          aria-label={`${copy.increaseGuests} ${label}`}
          disabled={!canIncrease}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </span>
    </div>
  );
}

/** Ô chọn khách của trang khách sạn: tổng người lớn, trẻ em, em bé tối đa 9. */
export function GuestPicker({
  adults,
  numChildren,
  numInfants,
  onChange,
}: {
  adults: number;
  numChildren: number;
  numInfants: number;
  onChange: (guests: Guests) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const canAdd = adults + numChildren + numInfants < MAX_GUESTS;
  const description = `${adults} ${copy.adultsLabel.toLowerCase()} · ${numChildren} ${copy.childrenLabel.toLowerCase()} · ${numInfants} ${copy.infantsLabel.toLowerCase()}`;
  useCloseOnScroll(isOpen, popupRef);

  const positionPopup = () => {
    const trigger = rootRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) return;
    placeBelow(trigger, popup);
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 32);
    popup.style.width = `${width}px`;
    popup.style.minWidth = '0';
    popup.style.left = `${Math.max(16, Math.min(rect.left, window.innerWidth - width - 16))}px`;
    const available = popup.dataset.side === 'top' ? rect.top : window.innerHeight - rect.bottom;
    popup.style.maxHeight = `${Math.max(0, available - 22)}px`;
  };

  return (
    <div ref={rootRef} className={styles.guestPicker}>
      <span>{copy.adults}</span>
      <button
        type="button"
        className={styles.guestTrigger}
        aria-expanded={isOpen}
        aria-label={description}
        title={description}
        popoverTarget={popupId}
        onClick={positionPopup}
      >
        {adults + numChildren + numInfants} {copy.guests}
      </button>
      <div
        ref={popupRef}
        id={popupId}
        popover="auto"
        className={styles.guestPopover}
        onToggle={(event) => setIsOpen(event.newState === 'open')}
      >
          <CountRow
            label={copy.adultsLabel}
            value={adults}
            canDecrease={adults > 1}
            canIncrease={canAdd}
            onChange={(value) => onChange({ adults: value, children: numChildren, infants: numInfants })}
          />
          <CountRow
            label={copy.childrenLabel}
            hint={copy.childrenHint}
            value={numChildren}
            canDecrease={numChildren > 0}
            canIncrease={canAdd}
            onChange={(value) => onChange({ adults, children: value, infants: numInfants })}
          />
          <CountRow
            label={copy.infantsLabel}
            hint={copy.infantsHint}
            value={numInfants}
            canDecrease={numInfants > 0}
            canIncrease={canAdd}
            onChange={(value) => onChange({ adults, children: numChildren, infants: value })}
          />
          <button type="button" className="secondary-button" onClick={() => popupRef.current?.hidePopover()}>
            {copy.guestsDone}
          </button>
      </div>
    </div>
  );
}
