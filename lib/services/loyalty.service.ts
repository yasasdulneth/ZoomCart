/**
 * ZOOMPOINTS: earn 1 pt per LKR 100 spent (on payable amount after redemption).
 * Redeem at checkout: 1 pt = 1 LKR off, capped by balance and order subtotal.
 */

export function calculateEarnedPoints(totalAmount: number) {
  const total = Number(totalAmount ?? 0);
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.floor(total / 100);
}

/** 1 ZOOMPOINT discounts 1 LKR; cannot redeem more than the bill or your balance. */
export function maxRedeemableZoomPoints(balance: number, orderTotalLkr: number): number {
  const b = Math.max(0, Math.floor(Number(balance)));
  const cap = Math.max(0, Math.floor(Number(orderTotalLkr)));
  return Math.min(b, cap);
}

export function payableAfterZoomPoints(orderTotalLkr: number, pointsRedeemed: number): number {
  const sub = Number(orderTotalLkr);
  if (!Number.isFinite(sub) || sub <= 0) return 0;
  const pts = Math.max(0, Math.floor(Number(pointsRedeemed)));
  return Math.round(Math.max(0, sub - pts) * 100) / 100;
}
