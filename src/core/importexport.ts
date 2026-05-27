import type { SSSData } from "./types";
import { DEFAULT_DATA } from "./defaults";

export function exportData(data: SSSData): string {
  return JSON.stringify({ ...data, exportedAt: Date.now(), exportVersion: "1" }, null, 2);
}

export function importData(json: string): { ok: true; data: SSSData } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(json) as Partial<SSSData> & { exportedAt?: number; exportVersion?: string };
    if (!Array.isArray(parsed.tree)) return { ok: false, error: "Missing or invalid 'tree' field" };
    if (typeof parsed.settings !== "object") return { ok: false, error: "Missing or invalid 'settings' field" };
    const data: SSSData = {
      ...DEFAULT_DATA,
      ...parsed,
      version: DEFAULT_DATA.version,
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
    };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}