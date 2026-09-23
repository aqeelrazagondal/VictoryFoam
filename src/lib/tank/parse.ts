export function parseNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRequiredNumber(value: string, label: string) {
  const parsed = parseNumber(value);
  if (parsed === null) return { error: `${label} is required.`, value: null };
  return { error: null, value: parsed };
}
