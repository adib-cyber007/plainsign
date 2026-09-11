import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from "../../../src/config/settings";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("extension settings", () => {
  it("uses safe defaults without extension storage", async () => {
    vi.stubGlobal("chrome", undefined);
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("normalizes partial storage and persists both controls", async () => {
    const get = vi.fn(async () => ({
      [SETTINGS_STORAGE_KEY]: { showTechnicalByDefault: true },
    }));
    const set = vi.fn(async () => undefined);
    vi.stubGlobal("chrome", { storage: { local: { get, set } } });

    await expect(loadSettings()).resolves.toEqual({
      showTechnicalByDefault: true,
      simulationEnabled: true,
    });
    await saveSettings({
      showTechnicalByDefault: false,
      simulationEnabled: false,
    });
    expect(set).toHaveBeenCalledWith({
      [SETTINGS_STORAGE_KEY]: {
        showTechnicalByDefault: false,
        simulationEnabled: false,
      },
    });
  });
});
