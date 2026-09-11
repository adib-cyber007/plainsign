export const SETTINGS_STORAGE_KEY = "plainsign:settings";

export interface PlainSignSettings {
  showTechnicalByDefault: boolean;
  simulationEnabled: boolean;
}

export const DEFAULT_SETTINGS: PlainSignSettings = {
  showTechnicalByDefault: false,
  simulationEnabled: true,
};

export function hasAlchemyKey(): boolean {
  return Boolean(import.meta.env?.VITE_ALCHEMY_KEY?.trim());
}

export async function loadSettings(): Promise<PlainSignSettings> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
    return normalizeSettings(stored[SETTINGS_STORAGE_KEY]);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: PlainSignSettings): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  await chrome.storage.local.set({
    [SETTINGS_STORAGE_KEY]: normalizeSettings(settings),
  });
}

function normalizeSettings(value: unknown): PlainSignSettings {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_SETTINGS };
  }
  const candidate = value as Partial<PlainSignSettings>;
  return {
    showTechnicalByDefault:
      typeof candidate.showTechnicalByDefault === "boolean"
        ? candidate.showTechnicalByDefault
        : DEFAULT_SETTINGS.showTechnicalByDefault,
    simulationEnabled:
      typeof candidate.simulationEnabled === "boolean"
        ? candidate.simulationEnabled
        : DEFAULT_SETTINGS.simulationEnabled,
  };
}
