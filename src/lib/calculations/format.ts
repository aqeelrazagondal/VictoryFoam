export const CALC_EPS = 1e-9;

export function nearlyEqual(a: number, b: number, eps = CALC_EPS) {
  return Math.abs(a - b) <= eps;
}

export function clampNonNegative(value: number) {
  return value < 0 && value > -CALC_EPS ? 0 : value;
}

export function isInClosedRange(value: number, min: number, max: number) {
  return value >= min - CALC_EPS && value <= max + CALC_EPS;
}

export function formatQty(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number, maximumFractionDigits = 2) {
  return `${new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}
