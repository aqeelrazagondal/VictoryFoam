/**
 * Factory number entry.
 * Decimal comma or point: 28,65 and 28.65.
 * Group thousands with spaces: 2 045.
 * A comma is always the decimal mark, so 1,000 is 1 (three decimal places), not 1000.
 * Mixed comma and point, or more than one comma, is rejected.
 */
export function parseNumber(value: string): number | null {
  const compact = value.trim().replace(/[\s\u00a0\u202f]/g, "");
  if (!compact) return null;
  if (compact.includes(",") && compact.includes(".")) return null;
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
      error: `${label} is not a valid number. Use 28,65 or 28.65, and spaces to group thousands.`,
      value: null,
    };
  }
  return { error: null, value: parsed };
}
