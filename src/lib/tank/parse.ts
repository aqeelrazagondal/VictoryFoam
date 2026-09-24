/**
 * Factory number entry.
 * Decimal comma or point: 28,65 and 28.65.
 * Group thousands with spaces: 2 045, or with commas in thousands groups: 8,000.
 * A single comma followed by one or two digits is a decimal mark.
 */
export function parseNumber(value: string): number | null {
  const compact = value.trim().replace(/[\s\u00a0\u202f]/g, "");
  if (!compact) return null;
  if (compact.includes(",") && compact.includes(".")) return null;

  if (/^-?\d{1,3}(,\d{3})+$/.test(compact)) {
    const grouped = Number(compact.replace(/,/g, ""));
    return Number.isFinite(grouped) ? grouped : null;
  }

  if ((compact.match(/,/g) ?? []).length > 1) return null;

  const normalized = compact.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRequiredNumber(value: string, label: string) {
  if (!value.trim()) return { error: `${label} is required.`, value: null };
  const parsed = parseNumber(value);
  if (parsed === null) {
    return {
      error: `${label} is not a valid number. Use 28,65 or 28.65, spaces or 8,000 for thousands.`,
      value: null,
    };
  }
  return { error: null, value: parsed };
}
