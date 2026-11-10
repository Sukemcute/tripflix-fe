'use client';

import { vi } from '@tripflix/i18n';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { FlightIcon, type FlightIconName } from './flight-icon';
import styles from './flights.module.css';

const copy = vi.flights;

export interface AirportOption {
  code: string;
  city: string;
  airportName: string;
  /** Dòng phụ bên phải, ví dụ số chuyến trên tuyến. */
  meta?: string;
}

interface AirportPickerProps {
  label: string;
  name: string;
  icon: FlightIconName;
  value: string;
  options: AirportOption[];
  placeholder: string;
  isDisabled: boolean;
  onChange: (code: string) => void;
}

// Bỏ dấu để gõ "da nang" vẫn ra "Đà Nẵng".
const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export function AirportPicker({
  label,
  name,
  icon,
  value,
  options,
  placeholder,
  isDisabled,
  onChange,
}: AirportPickerProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((option) => option.code === value);
  const query = normalize(keyword.trim());
  const matches = query
    ? options.filter((option) =>
        normalize(option.code + ' ' + option.city + ' ' + option.airportName).includes(query),
      )
    : options;

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [isOpen]);

  const open = () => {
    setKeyword('');
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((option) => option.code === value),
      ),
    );
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };
  const choose = (code: string) => {
    onChange(code);
    close();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (matches.length ? (index + step + matches.length) % matches.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const match = matches[activeIndex];
      if (match) choose(match.code);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  return (
    <div ref={rootRef} className={styles.field + ' ' + styles.airportField} data-open={isOpen || undefined}>
      <input type="hidden" name={name} value={value} />
      <button
        ref={triggerRef}
        type="button"
        className={styles.fieldTrigger}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label + (selected ? ': ' + selected.code + ' ' + selected.city : '')}
        disabled={isDisabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
      >
        <span className={styles.fieldIcon}>
          <FlightIcon name={icon} size={22} />
        </span>
        <span className={styles.fieldBody}>
          <span className={styles.fieldLabel}>{label}</span>
          {selected ? (
            <span className={styles.airportValue}>
              <strong>{selected.code}</strong>
              <span>{selected.city}</span>
            </span>
          ) : (
            <span className={styles.fieldPlaceholder}>{placeholder}</span>
          )}
        </span>
        <span className={styles.chevron}>
          <FlightIcon name="chevron" size={18} />
        </span>
      </button>
      {isOpen && (
        <div className={styles.popover}>
          <div className={styles.popoverSearch}>
            <FlightIcon name="search" size={18} />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-label={copy.searchAirport}
              aria-expanded="true"
              aria-controls={id + '-list'}
              aria-activedescendant={matches[activeIndex] ? id + '-' + matches[activeIndex].code : undefined}
              placeholder={copy.searchAirport}
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div id={id + '-list'} role="listbox" aria-label={label} className={styles.airportList}>
            {matches.map((option, index) => (
              <div
                key={option.code}
                id={id + '-' + option.code}
                role="option"
                tabIndex={-1}
                aria-selected={option.code === value}
                data-active={index === activeIndex || undefined}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => choose(option.code)}
              >
                <span className={styles.airportCode}>{option.code}</span>
                <span className={styles.airportText}>
                  <strong>{option.city}</strong>
                  {option.airportName && <span>{option.airportName}</span>}
                </span>
                {option.meta && <span className={styles.airportMeta}>{option.meta}</span>}
                {option.code === value && (
                  <span className={styles.airportCheck}>
                    <FlightIcon name="check" size={18} />
                  </span>
                )}
              </div>
            ))}
          </div>
          {matches.length === 0 && <p className={styles.airportEmpty}>{copy.noAirportMatch}</p>}
        </div>
      )}
    </div>
  );
}
