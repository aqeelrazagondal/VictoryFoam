export function parseNumber(value: string): number | null {
  const compact = value.trim().replace(/[\s\u00a0\u202f]/g, "");
  if (!compact) return null;

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  let normalized = compact;

  if (lastComma !== -1 && lastDot !== -1) {
    normalized =
      lastDot > lastComma
        ? compact.replace(/,/g, "")
        : compact.replace(/\./g, "").replace(",", ".");
  } else if (lastComma !== -1) {
    if (/^-?\d{1,3}(,\d{3})+$/.test(compact)) {
      normalized = compact.replace(/,/g, "");
    } else if (/^-?\d+,\d{1,2}$/.test(compact)) {
      normalized = compact.replace(",", ".");
    } else {
      return null;
    }
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRequiredNumber(value: string, label: string) {
  const parsed = parseNumber(value);
  if (parsed === null) return { error: `${label} is required.`, value: null };
  return { error: null, value: parsed };
}
