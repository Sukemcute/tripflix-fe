import { t, vi } from '@tripflix/i18n';
import { useId, type CSSProperties } from 'react';
import styles from './hotel-listing.module.css';

// shortcut: khoảng cố định 0–10 triệu; khi API trả giá thấp/cao nhất của kết quả thì lấy theo đó.
export const PRICE_RANGE_MAX = 10_000_000;
const PRICE_RANGE_STEP = 100_000;
// shortcut: sóng chỉ để trang trí, chưa phải phân bố giá thật; thay khi API có histogram giá.
const HISTOGRAM_PATH =
  'M0 48V40C20 40 30 38 40 36S60 30 75 30 100 22 115 14 140 6 150 12 165 20 175 18 192 22 200 30V48Z';

function formatVnd(amount: number) {
  return t('ota.priceVnd', { amount: new Intl.NumberFormat('vi-VN').format(amount) });
}

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
  const clipId = useId();
  const low = toSliderValue(priceMin, 0);
  const high = toSliderValue(priceMax, PRICE_RANGE_MAX);
  const highLabel =
    high >= PRICE_RANGE_MAX
      ? t('ota.priceNoLimit', { amount: new Intl.NumberFormat('vi-VN').format(PRICE_RANGE_MAX) })
      : formatVnd(high);
  const update = (nextLow: number, nextHigh: number) =>
    onChange({
      priceMin: nextLow > 0 ? String(nextLow) : '',
      priceMax: nextHigh < PRICE_RANGE_MAX ? String(nextHigh) : '',
    });
  const startPercent = (low / PRICE_RANGE_MAX) * 100;
  const endPercent = (high / PRICE_RANGE_MAX) * 100;
  const track = { '--range-start': `${startPercent}%`, '--range-end': `${endPercent}%` } as CSSProperties;
  return (
    <div className={styles.priceRange}>
      <output className={styles.priceRangeValue}>
        <span>{formatVnd(low)}</span>
        <span>{highLabel}</span>
      </output>
      <div className={styles.priceRangeChart} style={track}>
        <svg viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden="true">
          <clipPath id={clipId}>
            <rect x={startPercent * 2} y="0" width={(endPercent - startPercent) * 2} height="48" />
          </clipPath>
          <path d={HISTOGRAM_PATH} className={styles.priceRangeArea} />
          <path d={HISTOGRAM_PATH} className={styles.priceRangeAreaActive} clipPath={`url(#${clipId})`} />
        </svg>
        <div className={styles.priceRangeTrack}>
          <input
            type="range"
            min={0}
            max={PRICE_RANGE_MAX}
            step={PRICE_RANGE_STEP}
            value={low}
            // Hai nút dồn về mép phải thì nút giá thấp phải nằm trên, không thì bị nút kia che.
            style={low > PRICE_RANGE_MAX * 0.9 ? { zIndex: 2 } : undefined}
            aria-label={vi.ota.priceRangeMin}
            aria-valuetext={formatVnd(low)}
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
    </div>
  );
}
