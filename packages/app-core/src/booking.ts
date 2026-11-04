// Logic giữ chỗ phía client. Thời gian giữ chỗ do server quyết (docs/10 v0.6: 30 phút);
// client chỉ đếm ngược theo expiresAt server trả về, không tự tính.

export interface HoldCountdown {
  /** Số giây còn lại, không âm. */
  secondsLeft: number;
  expired: boolean;
}

export function holdCountdown(expiresAt: Date | string, now: Date = new Date()): HoldCountdown {
  const end = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const secondsLeft = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  return { secondsLeft, expired: secondsLeft === 0 };
}

export interface CartLine {
  /** Giá một đơn vị, VND. */
  unitPrice: number;
  quantity: number;
  /** Số đêm (phòng). Bỏ trống với vé, dịch vụ. */
  nights?: number;
}

/** Tạm tính giỏ lộ trình để hiển thị. Số tiền thanh toán thật luôn lấy từ server. */
export function cartSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity * (l.nights ?? 1), 0);
}
