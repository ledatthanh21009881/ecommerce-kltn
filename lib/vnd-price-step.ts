export const VND_PRICE_STEP = 1000

/** Giá = 0 được coi là hợp lệ (trường tùy chọn / chưa nhập). */
export function violatesVndPriceStep(value: number, step = VND_PRICE_STEP): boolean {
  if (!Number.isFinite(value) || value === 0) return false
  return Math.round(value) % step !== 0
}
