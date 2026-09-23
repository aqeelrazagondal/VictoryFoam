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

/** Factory-facing date and time for a tank log row. Prefer the entry day, with the clock from when it was logged. */
export function formatLogWhen(entryDate: string | null | undefined, loggedAt: string | null | undefined) {
  const instant = resolveLogInstant(entryDate, loggedAt);
  if (!instant) return null;
  const date = new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(instant);
  const time = new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
  return `${date} · ${time}`;
}

export function toDatetimeLocalValue(entryDate: string | null | undefined, loggedAt: string | null | undefined) {
  const instant = resolveLogInstant(entryDate, loggedAt);
  if (!instant) return "";
  const year = instant.getFullYear();
  const month = String(instant.getMonth() + 1).padStart(2, "0");
  const day = String(instant.getDate()).padStart(2, "0");
  const hour = String(instant.getHours()).padStart(2, "0");
  const minute = String(instant.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function parseDatetimeLocal(value: string): { entryDate: string; loggedAt: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const [, date, hour, minute] = match;
  const instant = new Date(`${date}T${hour}:${minute}:00`);
  if (Number.isNaN(instant.getTime())) return null;
  return { entryDate: date, loggedAt: instant.toISOString() };
}

function resolveLogInstant(entryDate: string | null | undefined, loggedAt: string | null | undefined) {
  if (loggedAt) {
    const logged = new Date(loggedAt);
    if (!Number.isNaN(logged.getTime())) {
      if (entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
        const [year, month, day] = entryDate.split("-").map(Number);
        return new Date(
          year,
          month - 1,
          day,
          logged.getHours(),
          logged.getMinutes(),
          logged.getSeconds(),
          logged.getMilliseconds(),
        );
      }
      return logged;
    }
  }
  if (entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    const [year, month, day] = entryDate.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }
  return null;
}
