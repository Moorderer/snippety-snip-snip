import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import browser from "webextension-polyfill";
import { readData, writeData, updateSettings } from "../core/storage";
import type { SSSData, SSSSettings, Theme } from "../core/types";

const C = {
  bg: "#0f172a", surface: "#1e293b", surface2: "#0f172a",
  border: "#334155", accent: "#6366f1", accentHover: "#818cf8",
  text: "#e2e8f0", muted: "#64748b", danger: "#ef4444", green: "#22c55e",
};

const inp = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  padding: "6px 10px", fontSize: 13, borderRadius: 5,
  border: `1px solid ${C.border}`, background: C.surface,
  color: C.text, outline: "none", width: "100%", boxSizing: "border-box" as const, ...extra,
});

const btn = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  padding: "6px 14px", fontSize: 12, borderRadius: 5,
  border: `1px solid ${C.border}`, background: C.surface,
  color: C.text, cursor: "pointer", ...extra,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function EnvVarEditor({ envVars, onChange }: {
  envVars: Record<string, string>;
  onChange(ev: Record<string, string>): void;
}) {
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const entries = Object.entries(envVars);

  const add = () => {
    if (!newKey.trim()) return;
    onChange({ ...envVars, [newKey.trim()]: newVal });
    setNewKey(""); setNewVal("");
  };

  const remove = (k: string) => {
    const next = { ...envVars }; delete next[k]; onChange(next);
  };

  const update = (k: string, v: string) => onChange({ ...envVars, [k]: v });

  return (
    <div>
      {entries.length === 0 && (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>No env vars yet. Use {"{{env.key}}"} in snippets.</div>
      )}
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.accent, minWidth: 100, fontFamily: "monospace" }}>{k}</span>
          <input style={{ ...inp(), fontSize: 12 }} value={v} onChange={e => update(k, e.target.value)} />
          <button style={btn({ padding: "4px 8px", color: C.danger })} onClick={() => remove(k)}>âœ•</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input style={{ ...inp(), fontSize: 12 }} placeholder="key" value={newKey} onChange={e => setNewKey(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <input style={{ ...inp(), fontSize: 12 }} placeholder="value" value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <button style={btn({ background: C.accent, border: "none", color: "#fff", padding: "4px 10px" })} onClick={add}>Add</button>
      </div>
    </div>
  );
}

function SiteListEditor({ label, sites, onChange }: {
  label: string; sites: string[]; onChange(s: string[]): void;
}) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim(); if (!v) return;
    onChange([...sites, v]); setVal("");
  };
  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</div>
      {sites.map(s => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 12, flex: 1, fontFamily: "monospace", color: C.text }}>{s}</span>
          <button style={btn({ padding: "2px 8px", color: C.danger })} onClick={() => onChange(sites.filter(x => x !== s))}>âœ•</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input style={{ ...inp(), fontSize: 12 }} placeholder="example.com" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <button style={btn({ background: C.accent, border: "none", color: "#fff", padding: "4px 10px" })} onClick={add}>Add</button>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState<SSSData | null>(null);
  const [saved, setSaved] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const load = useCallback(async () => { setData(await readData()); }, []);
  useEffect(() => { void load(); }, [load]);

  if (!data) return <div style={{ padding: 24, color: C.muted, fontFamily: "system-ui,sans-serif" }}>Loadingâ€¦</div>;

  const s = data.settings;

  const patch = async (partial: Partial<SSSSettings>) => {
    const updated = await updateSettings(partial);
    setData(updated);
  };

  const patchEnv = async (envVars: Record<string, string>) => {
    await patch({ envVars });
  };

  const saveAll = async () => {
    await writeData(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const exportAll = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "snippety-snip-snip-backup.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const importAll = async () => {
    try {
      setImportError("");
      const parsed = JSON.parse(importText) as SSSData;
      if (!parsed.tree || !parsed.settings) throw new Error("Invalid backup format");
      await writeData(parsed);
      await load();
      setImportText("");
      alert("Import successful!");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const resetCounters = async () => {
    if (!confirm("Reset all usage counters?")) return;
    data.counters = {};
    const flatReset = (tree: typeof data.tree): typeof data.tree =>
      tree.map(n => n.type === "snippet"
        ? { ...n, usageCount: 0 }
        : { ...n, children: flatReset((n as { children: typeof data.tree }).children) }
      );
    data.tree = flatReset(data.tree);
    await writeData(data);
    await load();
  };

  const root: React.CSSProperties = {
    minHeight: "100vh", background: C.bg, color: C.text,
    fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,sans-serif",
    padding: "24px 0",
  };
  const wrap: React.CSSProperties = { maxWidth: 640, margin: "0 auto", padding: "0 24px" };

  return (
    <div style={root}>
      <div style={wrap}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <span style={{ fontSize: 22 }}>âœ¦</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: C.accentHover, letterSpacing: "-.03em" }}>SnippetySnipSnip</span>
          <span style={{ fontSize: 13, color: C.muted, marginLeft: 4 }}>Settings</span>
        </div>

        <Section title="Appearance">
          abel style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
            Theme
            <select
              style={{ ...inp(), width: "auto", marginLeft: 8 }}
              value={s.theme}
              onChange={e => void patch({ theme: e.target.value as Theme })}
            >
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
        </Section>

        <Section title="Triggers">
          abel style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
            Trigger prefix
            <input
              style={{ ...inp(), width: 60, marginLeft: 8 }}
              value={s.triggerPrefix}
              onChange={e => void patch({ triggerPrefix: e.target.value })}
            />
          </label>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
            Type this prefix + trigger word in any text field to expand a snippet.
          </div>
          abel style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <input
              type="checkbox"
              checked={s.globalShortcutEnabled}
              onChange={e => void patch({ globalShortcutEnabled: e.target.checked })}
            />
            Enable global keyboard shortcut
          </label>
        </Section>

        <Section title="Environment Variables">
          <EnvVarEditor envVars={s.envVars} onChange={ev => void patchEnv(ev)} />
        </Section>

        <Section title="Site Blacklist">
          <SiteListEditor
            label="Snippets will not expand on these domains."
            sites={s.siteBlacklist}
            onChange={list => void patch({ siteBlacklist: list })}
          />
        </Section>

        <Section title="Storage">
          abel style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={s.syncEnabled}
              onChange={e => void patch({ syncEnabled: e.target.checked })}
            />
            Enable browser sync (uses browser.storage.sync)
          </label>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Syncs snippets across your browser profile. Disabled by default.
          </div>
          abel style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
            Self-hosted backend URL (optional)
            <input
              style={inp()}
              value={s.selfHostedBackendUrl}
              onChange={e => void patch({ selfHostedBackendUrl: e.target.value })}
              placeholder="https://your-server.example.com"
            />
          </label>
        </Section>

        <Section title="Import / Export">
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button style={btn({ background: C.accent, border: "none", color: "#fff" })} onClick={exportAll}>
              Export all (JSON)
            </button>
            <button style={btn({ color: C.danger })} onClick={resetCounters}>
              Reset usage counters
            </button>
          </div>
          abel style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
            Import JSON backup
            <textarea
              style={{ ...inp(), minHeight: 80, fontFamily: "monospace", fontSize: 11, resize: "vertical" }}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder='Paste exported JSON here then click Importâ€¦'
            />
          </label>
          {importError && <div style={{ fontSize: 12, color: C.danger, marginTop: 4 }}>{importError}</div>}
          <button
            style={{ ...btn({ background: C.accent, border: "none", color: "#fff", marginTop: 8 }), opacity: importText ? 1 : 0.5 }}
            onClick={() => void importAll()}
            disabled={!importText}
          >Import</button>
        </Section>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {saved && <span style={{ fontSize: 12, color: C.green, alignSelf: "center" }}>Saved âœ“</span>}
          <button style={btn({ background: C.accent, border: "none", color: "#fff", padding: "8px 20px", fontSize: 13 })} onClick={() => void saveAll()}>
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) ReactDOM.createRoot(rootEl).render(<App />);