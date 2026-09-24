export function compositionShareStep(pct: number) {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
}

export function compositionShareClass(pct: number) {
  return `composition-p-${compositionShareStep(pct)}`;
}
