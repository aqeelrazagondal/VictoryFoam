const PREFIX = "victory-foam-tank-draft:";

export function draftStorageKey(kind: "blend" | "fill" | "setup", tankId: string) {
  return `${PREFIX}${kind}:${tankId}`;
}

export function readJsonDraft<T>(key: string, parse: (value: unknown) => T | null): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return parse(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeJsonDraft(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function clearJsonDraft(key: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type BlendDraft = {
  step: number;
  chem1Id: string | null;
  chem2Id: string | null;
  chem3Id: string | null;
  targetPct: string;
  targetQty: string;
  thirdQty: string;
  showThird: boolean;
};

export function parseBlendDraft(value: unknown): BlendDraft | null {
  if (!isRecord(value) || typeof value.step !== "number") return null;
  return {
    step: value.step,
    chem1Id: typeof value.chem1Id === "string" ? value.chem1Id : null,
    chem2Id: typeof value.chem2Id === "string" ? value.chem2Id : null,
    chem3Id: typeof value.chem3Id === "string" ? value.chem3Id : null,
    targetPct: typeof value.targetPct === "string" ? value.targetPct : "",
    targetQty: typeof value.targetQty === "string" ? value.targetQty : "",
    thirdQty: typeof value.thirdQty === "string" ? value.thirdQty : "",
    showThird: value.showThird === true,
  };
}

export type FillDraft = {
  step: number;
  targetVolume: string;
  targetPct: string;
  chemAId: string | null;
  chemBId: string | null;
  chemCId: string | null;
  thirdQty: string;
  showThird: boolean;
};

export function parseFillDraft(value: unknown): FillDraft | null {
  if (!isRecord(value) || typeof value.step !== "number") return null;
  return {
    step: value.step,
    targetVolume: typeof value.targetVolume === "string" ? value.targetVolume : "",
    targetPct: typeof value.targetPct === "string" ? value.targetPct : "",
    chemAId: typeof value.chemAId === "string" ? value.chemAId : null,
    chemBId: typeof value.chemBId === "string" ? value.chemBId : null,
    chemCId: typeof value.chemCId === "string" ? value.chemCId : null,
    thirdQty: typeof value.thirdQty === "string" ? value.thirdQty : "",
    showThird: value.showThird === true,
  };
}

export type SetupDraft = {
  step: number;
  quantity: string;
  pct: string;
  chemicalId: string | null;
  skipChemical: boolean;
  capacity: string;
  heel: string;
};

export function parseSetupDraft(value: unknown): SetupDraft | null {
  if (!isRecord(value) || typeof value.step !== "number") return null;
  return {
    step: value.step,
    quantity: typeof value.quantity === "string" ? value.quantity : "",
    pct: typeof value.pct === "string" ? value.pct : "",
    chemicalId: typeof value.chemicalId === "string" ? value.chemicalId : null,
    skipChemical: value.skipChemical === true,
    capacity: typeof value.capacity === "string" ? value.capacity : "",
    heel: typeof value.heel === "string" ? value.heel : "",
  };
}

export const HUB_PANELS = ["add", "use", "correct"] as const;
export type HubPanel = (typeof HUB_PANELS)[number];

export function hubPanelKey(tankId: string) {
  return `${PREFIX}hub:${tankId}`;
}

export function parseHubPanel(value: unknown): HubPanel | null {
  return typeof value === "string" && (HUB_PANELS as readonly string[]).includes(value)
    ? (value as HubPanel)
    : null;
}

export function readHubPanel(tankId: string) {
  return readJsonDraft(hubPanelKey(tankId), parseHubPanel);
}

export function writeHubPanel(tankId: string, panel: HubPanel) {
  writeJsonDraft(hubPanelKey(tankId), panel);
}

export function clearHubPanel(tankId: string) {
  clearJsonDraft(hubPanelKey(tankId));
}
