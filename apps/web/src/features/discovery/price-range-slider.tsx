import { t, vi } from '@tripflix/i18n';
import { useId, useState, type CSSProperties } from 'react';
import styles from './hotel-listing.module.css';

// shortcut: khoảng cố định 0–10 triệu; khi API trả giá thấp/cao nhất của kết quả thì lấy theo đó.
export const PRICE_RANGE_MAX = 10_000_000;
const PRICE_RANGE_STEP = 50_000;
// shortcut: sóng chỉ để trang trí, chưa phải phân bố giá thật; thay khi API có histogram giá.
const HISTOGRAM_PATH =
  'M0 48V40C20 40 30 38 40 36S60 30 75 30 100 22 115 14 140 6 150 12 165 20 175 18 192 22 200 30V48Z';

function formatAmount(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount);
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
  // Đang kéo thì chỉ cập nhật nháp trong thanh trượt; thả tay mới đẩy lên bộ lọc. Đẩy mỗi bước sẽ render lại
  // cả màn tìm kiếm làm nút kéo trễ so với con trỏ (rung).
  const [draft, setDraft] = useState<{ low: number; high: number } | null>(null);
  const low = draft?.low ?? toSliderValue(priceMin, 0);
  const high = draft?.high ?? toSliderValue(priceMax, PRICE_RANGE_MAX);
  const highText =
    high >= PRICE_RANGE_MAX
      ? t('ota.priceNoLimit', { amount: formatAmount(PRICE_RANGE_MAX) })
      : formatAmount(high);
  const commit = () => {
    if (!draft) return;
    onChange({
      priceMin: draft.low > 0 ? String(draft.low) : '',
      priceMax: draft.high < PRICE_RANGE_MAX ? String(draft.high) : '',
    });
    setDraft(null);
  };
  const commitEvents = { onPointerUp: commit, onKeyUp: commit, onBlur: commit, onTouchEnd: commit };
  const startPercent = (low / PRICE_RANGE_MAX) * 100;
  const endPercent = (high / PRICE_RANGE_MAX) * 100;
  const track = { '--range-start': `${startPercent}%`, '--range-end': `${endPercent}%` } as CSSProperties;
  return (
    <div className={styles.priceRange}>
      {/* Hai ô rộng cố định, số canh giữa: đổi giá không làm chữ bên cạnh bị đẩy. */}
      <output className={styles.priceRangeValue}>
        <span className={styles.priceRangeBox}>{formatAmount(low)}</span>
        <span aria-hidden="true">–</span>
        <span className={styles.priceRangeBox}>{highText}</span>
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
            aria-valuetext={t('ota.priceVnd', { amount: formatAmount(low) })}
            onChange={(event) =>
              setDraft({ low: Math.min(Number(event.target.value), high - PRICE_RANGE_STEP), high })
            }
            {...commitEvents}
          />
          <input
            type="range"
            min={0}
            max={PRICE_RANGE_MAX}
            step={PRICE_RANGE_STEP}
            value={high}
            aria-label={vi.ota.priceRangeMax}
            aria-valuetext={t('ota.priceVnd', { amount: highText })}
            onChange={(event) =>
              setDraft({ low, high: Math.max(Number(event.target.value), low + PRICE_RANGE_STEP) })
            }
            {...commitEvents}
          />
        </div>
      </div>
    </div>
  );
}
