import { t, vi } from '@tripflix/i18n';
import type { CSSProperties } from 'react';
import styles from './hotel-listing.module.css';
import { formatPrice } from './trip-card';

// shortcut: khoảng cố định 0–10 triệu; khi API trả giá thấp/cao nhất của kết quả thì lấy theo đó.
export const PRICE_RANGE_MAX = 10_000_000;
const PRICE_RANGE_STEP = 100_000;

// Giá trị lọc rỗng = không giới hạn: kéo về 0 thì bỏ priceMin, kéo kịch phải thì bỏ priceMax.
function toSliderValue(value: string, fallback: number) {
  const amount = Number(value);
  return value && Number.isFinite(amount) ? Math.min(Math.max(amount, 0), PRICE_RANGE_MAX) : fallback;
}

export function PriceRangeSlider({
  priceMin,
  priceMax,
  onChange,
}: {
  priceMin: string;
  priceMax: string;
  onChange: (range: { priceMin: string; priceMax: string }) => void;
}) {
  const low = toSliderValue(priceMin, 0);
  const high = toSliderValue(priceMax, PRICE_RANGE_MAX);
  const highLabel =
    high >= PRICE_RANGE_MAX
      ? t('ota.priceNoLimit', { price: formatPrice(PRICE_RANGE_MAX) })
      : formatPrice(high);
  const update = (nextLow: number, nextHigh: number) =>
    onChange({
      priceMin: nextLow > 0 ? String(nextLow) : '',
      priceMax: nextHigh < PRICE_RANGE_MAX ? String(nextHigh) : '',
    });
  const track = {
    '--range-start': `${(low / PRICE_RANGE_MAX) * 100}%`,
    '--range-end': `${(high / PRICE_RANGE_MAX) * 100}%`,
  } as CSSProperties;
  return (
    <div className={styles.priceRange}>
      <output className={styles.priceRangeValue}>
        {formatPrice(low)} – {highLabel}
      </output>
      <div className={styles.priceRangeTrack} style={track}>
        <input
          type="range"
          min={0}
          max={PRICE_RANGE_MAX}
          step={PRICE_RANGE_STEP}
          value={low}
          // Hai nút dồn về mép phải thì nút giá thấp phải nằm trên, không thì bị nút kia che.
          style={low > PRICE_RANGE_MAX * 0.9 ? { zIndex: 2 } : undefined}
          aria-label={vi.ota.priceRangeMin}
          aria-valuetext={formatPrice(low)}
          onChange={(event) => update(Math.min(Number(event.target.value), high - PRICE_RANGE_STEP), high)}
        />
        <input
          type="range"
          min={0}
          max={PRICE_RANGE_MAX}
          step={PRICE_RANGE_STEP}
          value={high}
          aria-label={vi.ota.priceRangeMax}
          aria-valuetext={highLabel}
          onChange={(event) => update(low, Math.max(Number(event.target.value), low + PRICE_RANGE_STEP))}
        />
      </div>
    </div>
  );
}
