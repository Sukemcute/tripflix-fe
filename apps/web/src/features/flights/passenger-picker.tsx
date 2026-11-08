'use client';

import { MAX_FLIGHT_SEATS, type FlightPassengerMix } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { useEffect, useId, useRef, useState } from 'react';
import { FlightIcon } from './flight-icon';
import styles from './flights.module.css';

const copy = vi.flights;
const TYPES = [
  ['adult', 'adults'],
  ['child', 'children'],
  ['infant', 'infants'],
] as const;

type PassengerTypeKey = (typeof TYPES)[number][0];

/** "2 người lớn, 1 trẻ em": chỉ kể loại khách có trong nhóm. */
export function formatPassengerMix(mix: FlightPassengerMix): string {
  return TYPES.filter(([, field]) => mix[field] > 0)
    .map(([type, field]) => t(`flights.passengerTypes.${type}.count`, { count: mix[field] }))
    .join(', ');
}

/** Thêm hoặc bớt một khách, giữ luật: tối đa 9 ghế, mỗi em bé một người lớn. */
function changeCount(mix: FlightPassengerMix, type: PassengerTypeKey, step: 1 | -1): FlightPassengerMix {
  if (type === 'adult') {
    const adults = mix.adults + step;
    // Bớt người lớn thì em bé cũng không được nhiều hơn người lớn.
    return { ...mix, adults, infants: Math.min(mix.infants, adults) };
  }
  if (type === 'child') return { ...mix, children: mix.children + step };
  return { ...mix, infants: mix.infants + step };
}

function canChange(mix: FlightPassengerMix, type: PassengerTypeKey, step: 1 | -1): boolean {
  const seats = mix.adults + mix.children;
  if (step === 1) return type === 'infant' ? mix.infants < mix.adults : seats < MAX_FLIGHT_SEATS;
  if (type === 'adult') return mix.adults > 1;
  return (type === 'child' ? mix.children : mix.infants) > 0;
}

interface PassengerPickerProps {
  value: FlightPassengerMix;
  onChange: (value: FlightPassengerMix) => void;
}

/** Ô hành khách của form vé máy bay: người lớn, trẻ em, em bé, gửi kèm form bằng ô ẩn. */
export function PassengerPicker({ value, onChange }: PassengerPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useId();
  const total = value.adults + value.children + value.infants;

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={rootRef}
      className={styles.field + ' ' + styles.dateField + ' ' + styles.passengerField}
      data-open={isOpen || undefined}
    >
      <input type="hidden" name="passengers" value={value.adults} />
      {value.children > 0 && <input type="hidden" name="children" value={value.children} />}
      {value.infants > 0 && <input type="hidden" name="infants" value={value.infants} />}
      <button
        ref={triggerRef}
        type="button"
        className={styles.fieldTrigger}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-label={copy.adults + ': ' + formatPassengerMix(value)}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.fieldIcon}>
          <FlightIcon name="users" size={22} />
        </span>
        <span className={styles.fieldBody}>
          <span className={styles.fieldLabel}>{copy.adults}</span>
          <span className={styles.dateValue}>
            <strong>{total}</strong>
            <span title={formatPassengerMix(value)}>{formatPassengerMix(value)}</span>
          </span>
        </span>
      </button>
      {isOpen && (
        <fieldset id={popoverId} className={styles.popover + ' ' + styles.passengerPopover}>
          <legend className={styles.srOnly}>{copy.pickPassengers}</legend>
          {TYPES.map(([type, field]) => {
            const label = copy.passengerTypes[type].label;
            const lowerLabel = label.toLowerCase();
            return (
              <div key={type} className={styles.passengerRow}>
                <span className={styles.passengerText}>
                  <strong>{label}</strong>
                  <span>{copy.passengerTypes[type].hint}</span>
                </span>
                <span className={styles.stepper}>
                  <button
                    type="button"
                    aria-label={t('flights.decreasePassengerType', { type: lowerLabel })}
                    disabled={!canChange(value, type, -1)}
                    onClick={() => onChange(changeCount(value, type, -1))}
                  >
                    <FlightIcon name="minus" size={16} />
                  </button>
                  <output aria-live="polite" aria-label={label}>
                    {value[field]}
                  </output>
                  <button
                    type="button"
                    aria-label={t('flights.increasePassengerType', { type: lowerLabel })}
                    disabled={!canChange(value, type, 1)}
                    onClick={() => onChange(changeCount(value, type, 1))}
                  >
                    <FlightIcon name="plus" size={16} />
                  </button>
                </span>
              </div>
            );
          })}
          <div className={styles.passengerFooter}>
            <span>{copy.passengerRules}</span>
            <button type="button" onClick={close}>
              {copy.passengersDone}
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
