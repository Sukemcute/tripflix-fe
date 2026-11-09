'use client';
import { vi } from '@tripflix/i18n';
import { useEffect, useRef, useState } from 'react';
import styles from './hotel.module.css';

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
  const [isOpen, setIsOpen] = useState(false);
  const canAdd = adults + numChildren + numInfants < MAX_GUESTS;

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={styles.guestPicker}>
      <span>{copy.adults}</span>
      <button
        type="button"
        className={styles.guestTrigger}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {adults} {copy.adultsLabel.toLowerCase()} · {numChildren} {copy.childrenLabel.toLowerCase()}
        {numInfants > 0 && ` · ${numInfants} ${copy.infantsLabel.toLowerCase()}`}
      </button>
      {isOpen && (
        <div className={styles.guestPopover}>
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
          <button type="button" className="secondary-button" onClick={() => setIsOpen(false)}>
            {copy.guestsDone}
          </button>
        </div>
      )}
    </div>
  );
}
