# SnippetySnipSnip — Tasks 3-10 bootstrap
# Part 1/8 — run AFTER all 8 parts are saved as push-all.ps1
# (this file will be overwritten by subsequent parts — wait for all 8)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-File($path, $content) {
  $dir = Split-Path $path -Parent
  if ($dir -and !(Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $full = (Resolve-Path ".").Path + "\" + $path.Replace("/", "\")
  [System.IO.File]::WriteAllText($full, $content, [System.Text.Encoding]::UTF8)
}

Write-Host "Writing Task 3: popup snippet manager..."

Write-File "src/popup/index.tsx" @'
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import browser from "webextension-polyfill";
import { readData, writeData, removeNodeById, findNodeById } from "../core/storage";
import { createSnippet, createFolder } from "../core/factories";
import type { SSSData, Snippet, Folder, TreeNode } from "../core/types";

function fuzzy(needle: string, haystack: string): boolean {
  if (!needle) return true;
  const n = needle.toLowerCase(), h = haystack.toLowerCase();
  let ni = 0;
  for (let i = 0; i < h.length && ni < n.length; i++) if (h[i] === n[ni]) ni++;
  return ni === n.length;
}

function flatSnippets(tree: TreeNode[]): Snippet[] {
  const out: Snippet[] = [];
  for (const node of tree) {
    if (node.type === "snippet") out.push(node);
    else out.push(...flatSnippets((node as Folder).children));
  }
  return out;
}

const C = {
  bg: "#0f172a", surface: "#1e293b", border: "#334155",
  accent: "#6366f1", accentHover: "#818cf8",
  text: "#e2e8f0", muted: "#64748b", danger: "#ef4444",
  green: "#22c55e", yellow: "#eab308",
};

const btn = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  padding: "4px 10px", fontSize: 12, borderRadius: 5,
  border: `1px solid ${C.border}`, background: C.surface,
  color: C.text, cursor: "pointer", transition: "background .15s", ...extra,
});

const inp = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: "100%", boxSizing: "border-box" as const, padding: "5px 8px",
  fontSize: 12, borderRadius: 4, border: `1px solid ${C.border}`,
  background: C.bg, color: C.text, outline: "none", ...extra,
});

function TreeRow({ node, depth, selectedId, onSelect, onDelete, onToggleFav }: {
  node: TreeNode; depth: number; selectedId: string | null;
  onSelect(id: string): void; onDelete(id: string): void; onToggleFav(id: string): void;
}) {
  const [open, setOpen] = useState(true);
  const isSnip = node.type === "snippet";
  const sel = selectedId === node.id;
  return (
    <>
      <div
        onClick={() => isSnip ? onSelect(node.id) : setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 6px", paddingLeft: 8 + depth * 14,
          borderRadius: 4, cursor: "pointer",
          background: sel ? C.accent : "transparent",
          color: sel ? "#fff" : C.text, fontSize: 12, userSelect: "none",
        }}
      >
        <span style={{ opacity: 0.6, fontSize: 11 }}>{isSnip ? "✦" : open ? "▾" : "▸"}</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isSnip && (node as Snippet).favorite && <span style={{ color: C.yellow, marginRight: 3 }}>★</span>}
          {node.name}
        </span>
        {isSnip && (
          <span style={{ display: "flex", gap: 4, opacity: sel ? 1 : 0.4 }}>
            <span title="Favourite" onClick={e => { e.stopPropagation(); onToggleFav(node.id); }} style={{ cursor: "pointer", fontSize: 11 }}>★</span>
            <span title="Delete" onClick={e => { e.stopPropagation(); onDelete(node.id); }} style={{ cursor: "pointer", color: C.danger, fontSize: 11 }}>✕</span>
          </span>
        )}
      </div>
      {!isSnip && open && (node as Folder).children.map(c => (
        <TreeRow key={c.id} node={c} depth={depth + 1} selectedId={selectedId}
          onSelect={onSelect} onDelete={onDelete} onToggleFav={onToggleFav} />
      ))}
    </>
  );
}

function SnippetEditor({ snippet, onSave, onCancel }: {
  snippet: Snippet; onSave(s: Snippet): void; onCancel(): void;
}) {
  const [name, setName] = useState(snippet.name);
  const [trigger, setTrigger] = useState(snippet.trigger);
  const [tags, setTags] = useState(snippet.tags.join(", "));
  const [content, setContent] = useState(
    snippet.content[0]?.type === "richtext" ? snippet.content[0].html : ""
  );
  const save = () => onSave({
    ...snippet,
    name: name.trim() || "Untitled",
    trigger: trigger.trim(),
    tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    content: [{ type: "richtext", html: content }],
    updatedAt: Date.now(),
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>
        {snippet.name ? "Edit snippet" : "New snippet"}
      </div>
      abel style={{ fontSize: 11, color: C.muted }}>Name
        <input style={{ ...inp(), marginTop: 2 }} value={name} onChange={e => setName(e.target.value)} />
      </label>
      abel style={{ fontSize: 11, color: C.muted }}>Trigger
        <input style={{ ...inp(), marginTop: 2 }} value={trigger} onChange={e => setTrigger(e.target.value)} placeholder="/trigger" />
      </label>
      abel style={{ fontSize: 11, color: C.muted }}>Tags (comma separated)
        <input style={{ ...inp(), marginTop: 2 }} value={tags} onChange={e => setTags(e.target.value)} placeholder="work, email" />
      </label>
      abel style={{ fontSize: 11, color: C.muted }}>Content
        <textarea
          style={{ ...inp(), marginTop: 2, minHeight: 90, resize: "vertical", fontFamily: "monospace" }}
          value={content} onChange={e => setContent(e.target.value)}
          placeholder="Text here. Use {{cursor}} for caret, {{env.key}} for env vars."
        />
      </label>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button style={btn({ background: C.accent, border: "none", color: "#fff" })} onClick={save}>Save</button>
        <button style={btn()} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState<SSSData | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Snippet | null>(null);
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"list" | "tree">("list");
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => { setData(await readData()); }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { searchRef.current?.focus(); }, []);

  const snippets = data ? flatSnippets(data.tree) : [];
  const filtered = snippets.filter(s =>
    fuzzy(query, s.name) || fuzzy(query, s.trigger) || s.tags.some(t => fuzzy(query, t))
  );
  const listItems = query
    ? filtered
    : [...snippets.filter(s => s.favorite), ...snippets.filter(s => !s.favorite)];
  const unique = Array.from(new Map(listItems.map(s => [s.id, s])).values());

  const handleInsert = async (snippet: Snippet) => {
    const rawText = snippet.content.map(b =>
      b.type === "richtext" ? b.html : b.type === "code" ? b.code : ""
    ).join("\n");
    const cursorOffset = rawText.indexOf("{{cursor}}");
    const text = rawText.replace("{{cursor}}", "");
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await browser.tabs.sendMessage(tab.id, { type: "SSS_INSERT", text, cursorOffset: cursorOffset >= 0 ? cursorOffset : undefined });
        if (data) {
          const node = findNodeById(data.tree, snippet.id) as Snippet | null;
          if (node) { node.usageCount++; await writeData(data); }
        }
        setStatus(`Inserted "${snippet.name}"`);
        setTimeout(() => setStatus(""), 1500);
      }
    } catch { setStatus("No active text field found"); setTimeout(() => setStatus(""), 2000); }
  };

  const handleSave = async (updated: Snippet) => {
    if (!data) return;
    const exists = !!findNodeById(data.tree, updated.id);
    if (exists) {
      const replace = (tree: TreeNode[]): TreeNode[] => tree.map(n =>
        n.id === updated.id ? updated : n.type === "folder" ? { ...n, children: replace(n.children) } : n
      );
      data.tree = replace(data.tree);
    } else { data.tree.push(updated); }
    await writeData(data); setEditing(null); await load();
  };

  const handleDelete = async (id: string) => {
    if (!data) return;
    if (!confirm("Delete this snippet?")) return;
    data.tree = removeNodeById(data.tree, id);
    await writeData(data); if (selectedId === id) setSelectedId(null); await load();
  };

  const handleToggleFav = async (id: string) => {
    if (!data) return;
    const node = findNodeById(data.tree, id) as Snippet | null;
    if (node) { node.favorite = !node.favorite; await writeData(data); await load(); }
  };

  const newFolder = async () => {
    if (!data) return;
    const name = prompt("Folder name:"); if (!name) return;
    data.tree.push(createFolder(name)); await writeData(data); await load();
  };

  return (
    <div style={{ width: 340, minHeight: 460, maxHeight: 560, background: C.bg, color: C.text, fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 15 }}>✦</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: C.accentHover, letterSpacing: "-.02em" }}>SnippetySnipSnip</span>
        <span style={{ flex: 1 }} />
        <button style={btn({ padding: "2px 7px", fontSize: 11 })} onClick={() => setView(v => v === "list" ? "tree" : "list")} title="Toggle view">{view === "list" ? "🌲" : "☰"}</button>
        <button style={btn({ padding: "2px 7px", fontSize: 11 })} onClick={newFolder} title="New folder">📁</button>
        <button style={btn({ padding: "2px 7px", fontSize: 11, background: C.accent, border: "none", color: "#fff" })} onClick={() => setEditing(createSnippet("", ""))}>+ New</button>
        <button style={btn({ padding: "2px 7px", fontSize: 11 })} onClick={() => browser.runtime.openOptionsPage()} title="Settings">⚙</button>
      </div>

      {editing ? (
        <div style={{ overflowY: "auto", flex: 1 }}>
          <SnippetEditor snippet={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <input
              ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search snippets… (fuzzy)"
              style={{ ...inp(), fontSize: 12 }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {view === "tree" && data ? (
              data.tree.length === 0
                ? <div style={{ padding: 16, color: C.muted, fontSize: 12, textAlign: "center" }}>No snippets yet. Hit + New to start.</div>
                : data.tree.map(n => <TreeRow key={n.id} node={n} depth={0} selectedId={selectedId} onSelect={setSelectedId} onDelete={handleDelete} onToggleFav={handleToggleFav} />)
            ) : (
              unique.length === 0
                ? <div style={{ padding: 16, color: C.muted, fontSize: 12, textAlign: "center" }}>{query ? "No matches" : "No snippets yet. Hit + New to start."
				              }</div>
                : unique.map(s => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 10px", borderBottom: `1px solid ${C.border}`,
                      cursor: "pointer", background: selectedId === s.id ? C.surface : "transparent",
                    }}
                    onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.favorite && <span style={{ color: C.yellow, marginRight: 3 }}>★</span>}
                        {s.name}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                        {s.trigger && <span style={{ marginRight: 6, color: C.accent }}>{s.trigger}</span>}
                        {s.tags.map(t => (
                          <span key={t} style={{ marginRight: 4, background: C.surface, borderRadius: 3, padding: "1px 4px", fontSize: 10 }}>{t}</span>
                        ))}
                        {s.usageCount > 0 && <span style={{ color: C.muted, marginLeft: 4 }}>↑{s.usageCount}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        style={btn({ padding: "2px 7px", fontSize: 11, background: C.accent, border: "none", color: "#fff" })}
                        onClick={e => { e.stopPropagation(); void handleInsert(s); }}
                        title="Insert into active field"
                      >Insert</button>
                      <button
                        style={btn({ padding: "2px 7px", fontSize: 11 })}
                        onClick={e => { e.stopPropagation(); setEditing(s); }}
                        title="Edit"
                      >✎</button>
                      <button
                        style={btn({ padding: "2px 7px", fontSize: 11 })}
                        onClick={e => { e.stopPropagation(); void handleToggleFav(s.id); }}
                        title="Toggle favourite"
                      >{s.favorite ? "★" : "☆"}</button>
                      <button
                        style={btn({ padding: "2px 7px", fontSize: 11, color: C.danger })}
                        onClick={e => { e.stopPropagation(); void handleDelete(s.id); }}
                        title="Delete"
                      >✕</button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </>
      )}

      {status && (
        <div style={{ padding: "6px 12px", background: C.surface, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.green, flexShrink: 0 }}>
          {status}
        </div>
      )}
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) ReactDOM.createRoot(rootEl).render(<App />);
'@

Write-Host "Task 3 popup done."
Write-Host "Writing Task 4: content script insertion flow..."

Write-File "src/content/index.ts" @'
import browser from "webextension-polyfill";

// ── Shadow DOM host ───────────────────────────────────────────────────────────
let shadowRoot: ShadowRoot | null = null;

function ensureHost(): ShadowRoot {
  if (shadowRoot) return shadowRoot;
  const host = document.createElement("div");
  host.id = "sss-root-host";
  Object.assign(host.style, {
    all: "initial", position: "fixed", bottom: "0", right: "0",
    zIndex: "2147483647", pointerEvents: "none",
  });
  shadowRoot = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);
  return shadowRoot;
}

// ── Find the active editable element ─────────────────────────────────────────
function getActiveEditable(): HTMLElement | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return el;
  if (el.isContentEditable) return el;
  return null;
}

// ── Insert text into a native input/textarea ──────────────────────────────────
function insertIntoInput(el: HTMLInputElement | HTMLTextAreaElement, text: string, cursorOffset?: number) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  const newVal = before + text + after;
  // Use native input setter so React/Vue onChange fires
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    "value"
  )?.set;
  if (nativeInputValueSetter) nativeInputValueSetter.call(el, newVal);
  else el.value = newVal;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  const pos = cursorOffset !== undefined ? start + cursorOffset : start + text.length;
  el.setSelectionRange(pos, pos);
}

// ── Insert into contenteditable ───────────────────────────────────────────────
function insertIntoContentEditable(el: HTMLElement, text: string, cursorOffset?: number) {
  el.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    el.textContent = (el.textContent ?? "") + text;
    return;
  }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  // Split on {{cursor}} if present
  const cursorMarker = "{{cursor}}";
  const cursorIdx = text.indexOf(cursorMarker);
  const cleanText = text.replace(cursorMarker, "");
  const textNode = document.createTextNode(cleanText);
  range.insertNode(textNode);
  // Position caret
  const newRange = document.createRange();
  if (cursorOffset !== undefined && cursorIdx >= 0) {
    newRange.setStart(textNode, Math.min(cursorIdx, cleanText.length));
  } else {
    newRange.setStart(textNode, cleanText.length);
  }
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// ── Resolve env vars in text ──────────────────────────────────────────────────
async function resolveEnvVars(text: string): Promise<string> {
  const { sss_data } = await browser.storage.local.get("sss_data") as { sss_data?: { settings?: { envVars?: Record<string, string> } } };
  const envVars = sss_data?.settings?.envVars ?? {};
  return text.replace(/\{\{env\.([^}]+)\}\}/g, (_, key: string) => envVars[key] ?? "");
}

// ── Trigger detection (/trigger in text fields) ───────────────────────────────
let lastInput = "";

async function handleTriggerInput(el: HTMLInputElement | HTMLTextAreaElement) {
  const val = el.value;
  const prefix = "/";
  const idx = val.lastIndexOf(prefix);
  if (idx === -1) return;
  const typed = val.slice(idx + 1);
  if (!typed) return;

  const { sss_data } = await browser.storage.local.get("sss_data") as { sss_data?: { tree?: unknown[] } };
  if (!sss_data?.tree) return;

  function flat(tree: unknown[]): Array<{ trigger: string; name: string; content: Array<{ type: string; html?: string; code?: string }> }> {
    const out: Array<{ trigger: string; name: string; content: Array<{ type: string; html?: string; code?: string }> }> = [];
    for (const node of tree as Array<{ type: string; trigger?: string; name: string; content?: Array<{ type: string; html?: string; code?: string }>; children?: unknown[] }>) {
      if (node.type === "snippet" && node.trigger) out.push(node as { trigger: string; name: string; content: Array<{ type: string; html?: string; code?: string }> });
      else if (node.type === "folder" && node.children) out.push(...flat(node.children));
    }
    return out;
  }

  const snippets = flat(sss_data.tree as unknown[]);
  const match = snippets.find(s => s.trigger === `/${typed}` || s.trigger === typed);
  if (!match) return;

  // Replace the trigger text with snippet content
  const rawText = match.content.map(b => b.type === "richtext" ? (b.html ?? "") : b.type === "code" ? (b.code ?? "") : "").join("\n");
  const resolved = await resolveEnvVars(rawText);
  const cursorIdx = resolved.indexOf("{{cursor}}");
  const cleanText = resolved.replace("{{cursor}}", "");

  const start = idx;
  const end = el.selectionStart ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  const nativeSetter = Object.getOwnPropertyDescriptor(
    el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value"
  )?.set;
  const newVal = before + cleanText + after;
  if (nativeSetter) nativeSetter.call(el, newVal);
  else el.value = newVal;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  const pos = cursorIdx >= 0 ? start + cursorIdx : start + cleanText.length;
  el.setSelectionRange(pos, pos);
}

// ── Global keyup listener for trigger detection ───────────────────────────────
document.addEventListener("keyup", (e: KeyboardEvent) => {
  const el = e.target as HTMLElement;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    void handleTriggerInput(el as HTMLInputElement | HTMLTextAreaElement);
  }
}, true);

// ── Message listener ──────────────────────────────────────────────────────────
browser.runtime.onMessage.addListener(async (message) => {
  const msg = message as { type: string; text?: string; cursorOffset?: number };

  if (msg.type === "SSS_INSERT") {
    const text = msg.text ?? "";
    const resolved = await resolveEnvVars(text);
    const el = getActiveEditable();
    if (!el) return { type: "SSS_ERROR", message: "No active editable element" };
    const tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") {
      insertIntoInput(el as HTMLInputElement | HTMLTextAreaElement, resolved, msg.cursorOffset);
    } else if (el.isContentEditable) {
      insertIntoContentEditable(el, resolved, msg.cursorOffset);
    }
    return { type: "SSS_INSERT_OK" };
  }

  if (msg.type === "SSS_GET_PAGE_INFO") {
    return { type: "SSS_PAGE_INFO", url: location.href, title: document.title };
  }

  if (msg.type === "SSS_SHOW_BADGE") {
    const sr = ensureHost();
    const existing = sr.querySelector("#sss-badge");
    if (existing) return;
    const badge = document.createElement("div");
    badge.id = "sss-badge";
    Object.assign(badge.style, {
      position: "fixed", bottom: "16px", right: "16px",
      background: "rgba(15,23,42,0.92)", color: "#e2e8f0",
      fontFamily: "system-ui,sans-serif", fontSize: "12px",
      padding: "6px 12px", borderRadius: "8px",
      border: "1px solid #334155", pointerEvents: "none",
      opacity: "1", transition: "opacity .4s",
    });
    badge.textContent = "✦ SnippetySnipSnip ready";
    sr.appendChild(badge);
    setTimeout(() => { badge.style.opacity = "0"; setTimeout(() => badge.remove(), 400); }, 2000);
  }

  return undefined;
});

// Announce readiness
void browser.runtime.sendMessage({ type: "SSS_PING" }).catch(() => {/* bg not ready yet */});
'@

Write-Host "Task 4 content script done."
Write-Host "Writing Task 5: options page + env vars + settings..."

Write-File "src/options/index.tsx" @'
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
          <button style={btn({ padding: "4px 8px", color: C.danger })} onClick={() => remove(k)}>✕</button>
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
          <button style={btn({ padding: "2px 8px", color: C.danger })} onClick={() => onChange(sites.filter(x => x !== s))}>✕</button>
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

  if (!data) return <div style={{ padding: 24, color: C.muted, fontFamily: "system-ui,sans-serif" }}>Loading…</div>;

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
          <span style={{ fontSize: 22 }}>✦</span>
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
              placeholder='Paste exported JSON here then click Import…'
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
          {saved && <span style={{ fontSize: 12, color: C.green, alignSelf: "center" }}>Saved ✓</span>}
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
'@

Write-Host "Task 5 options page done."
Write-Host "Writing Task 6: inline trigger + Shadow DOM command palette..."

Write-File "src/content/palette.ts" @'
import browser from "webextension-polyfill";
import type { Snippet, TreeNode, Folder } from "../core/types";

// ── flatten tree to snippets ──────────────────────────────────────────────────
function flatSnippets(tree: TreeNode[]): Snippet[] {
  const out: Snippet[] = [];
  for (const node of tree) {
    if (node.type === "snippet") out.push(node);
    else out.push(...flatSnippets((node as Folder).children));
  }
  return out;
}

// ── fuzzy match ───────────────────────────────────────────────────────────────
function fuzzy(needle: string, haystack: string): boolean {
  if (!needle) return true;
  const n = needle.toLowerCase(), h = haystack.toLowerCase();
  let ni = 0;
  for (let i = 0; i < h.length && ni < n.length; i++) if (h[i] === n[ni]) ni++;
  return ni === n.length;
}

// ── styles injected into shadow DOM ──────────────────────────────────────────
const PALETTE_CSS = `
  :host { all: initial; }
  #sss-palette {
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    width: 420px;
    max-height: 380px;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 10px;
    box-shadow: 0 24px 64px rgba(0,0,0,.7);
    display: flex;
    flex-direction: column;
    font-family: system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
    font-size: 13px;
    color: #e2e8f0;
    z-index: 2147483647;
    overflow: hidden;
  }
  #sss-search {
    padding: 12px 14px;
    background: transparent;
    border: none;
    border-bottom: 1px solid #334155;
    color: #e2e8f0;
    font-size: 13px;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }
  #sss-search::placeholder { color: #475569; }
  #sss-list {
    overflow-y: auto;
    flex: 1;
  }
  .sss-item {
    padding: 9px 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #1e293b;
    transition: background .1s;
  }
  .sss-item:hover, .sss-item.active {
    background: #1e293b;
  }
  .sss-item-name { flex: 1; font-weight: 500; }
  .sss-item-trigger { font-size: 11px; color: #6366f1; font-family: monospace; }
  .sss-item-tags { font-size: 10px; color: #475569; }
  .sss-item-fav { color: #eab308; font-size: 11px; }
  #sss-footer {
    padding: 6px 14px;
    font-size: 10px;
    color: #475569;
    border-top: 1px solid #1e293b;
    display: flex;
    gap: 12px;
  }
  kbd {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 10px;
    font-family: monospace;
  }
`;

export class CommandPalette {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLElement | null = null;
  private snippets: Snippet[] = [];
  private filtered: Snippet[] = [];
  private activeIdx = 0;
  private targetEl: HTMLElement | null = null;
  private onInsert: (snippet: Snippet, target: HTMLElement) => void;

  constructor(onInsert: (snippet: Snippet, target: HTMLElement) => void) {
    this.onInsert = onInsert;
  }

  async open(target: HTMLElement, initialQuery = "") {
    this.targetEl = target;
    if (!this.host) this.mount();
    await this.loadSnippets();
    this.show(initialQuery);
  }

  private mount() {
    this.host = document.createElement("div");
    this.host.id = "sss-palette-host";
    Object.assign(this.host.style, { all: "initial", position: "fixed", zIndex: "2147483647", top: "0", left: "0" });
    this.shadow = this.host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = PALETTE_CSS;
    this.shadow.appendChild(style);

    const palette = document.createElement("div");
    palette.id = "sss-palette";

    this.input = document.createElement("input");
    this.input.id = "sss-search";
    this.input.placeholder = "Search snippets…";
    this.input.addEventListener("input", () => this.render());
    this.input.addEventListener("keydown", e => this.handleKey(e));
    palette.appendChild(this.input);

    this.list = document.createElement("div");
    this.list.id = "sss-list";
    palette.appendChild(this.list);

    const footer = document.createElement("div");
    footer.id = "sss-footer";
    footer.innerHTML = "<span><kbd>↑↓</kbd> navigate</span><span><kbd>Enter</kbd> insert</span><span><kbd>Esc</kbd> close</span>";
    palette.appendChild(footer);

    this.shadow.appendChild(palette);
    document.documentElement.appendChild(this.host);

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") this.close();
    });
    document.addEventListener("mousedown", e => {
      if (this.host && !this.host.contains(e.target as Node)) this.close();
    });
  }

  private async loadSnippets() {
    const { sss_data } = await browser.storage.local.get("sss_data") as { sss_data?: { tree?: TreeNode[] } };
    this.snippets = flatSnippets(sss_data?.tree ?? []);
    const favs = this.snippets.filter(s => s.favorite);
    const rest = this.snippets.filter(s => !s.favorite);
    this.snippets = [...favs, ...rest];
  }

  private show(query: string) {
    if (this.input) { this.input.value = query; }
    this.activeIdx = 0;
    this.render();
    requestAnimationFrame(() => this.input?.focus());
  }

  private render() {
    if (!this.list || !this.input) return;
    const q = this.input.value;
    this.filtered = q
      ? this.snippets.filter(s => fuzzy(q, s.name) || fuzzy(q, s.trigger) || s.tags.some(t => fuzzy(q, t)))
      : this.snippets;

    this.list.innerHTML = "";
    if (this.filtered.length === 0) {
      const empty = document.createElement("div");
      Object.assign(empty.style, { padding: "16px 14px", color: "#475569", fontSize: "12px" });
      empty.textContent = "No snippets found";
      this.list.appendChild(empty);
      return;
    }

    this.filtered.forEach((s, i) => {
      const item = document.createElement("div");
      item.className = "sss-item" + (i === this.activeIdx ? " active" : "");
      item.innerHTML = `
        ${s.favorite ? '<span class="sss-item-fav">★</span>' : ""}
        <span class="sss-item-name">${s.name}</span>
        ${s.trigger ? `<span class="sss-item-trigger">${s.trigger}</span>` : ""}
        ${s.tags.length ? `<span class="sss-item-tags">${s.tags.join(", ")}</span>` : ""}
      `;
      item.addEventListener("mousedown", e => {
        e.preventDefault();
        this.select(i);
      });
      this.list!.appendChild(item);
    });

    // scroll active into view
    const activeEl = this.list.querySelectorAll(".sss-item")[this.activeIdx] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: "nearest" });
  }

  private handleKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); this.activeIdx = Math.min(this.activeIdx + 1, this.filtered.length - 1); this.render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); this.activeIdx = Math.max(this.activeIdx - 1, 0); this.render(); }
    else if (e.key === "Enter") { e.preventDefault(); this.select(this.activeIdx); }
    else if (e.key === "Escape") { this.close(); }
  }

  private select(idx: number) {
    const snippet = this.filtered[idx];
    if (snippet && this.targetEl) {
      this.onInsert(snippet, this.targetEl);
      this.close();
    }
  }

  close() {
    this.host?.remove();
    this.host = null;
    this.shadow = null;
    this.input = null;
    this.list = null;
  }
}
'@

Write-Host "Task 6 palette done."
Write-Host "Writing Task 7: variable engine + expansion modal..."

Write-File "src/core/variables.ts" @'
import type { SnippetVariable, Snippet } from "./types";

export interface ResolvedVars { [varId: string]: string }

// ── Format a date using a simple format string ────────────────────────────────
// Tokens: YYYY MM DD HH mm ss ddd (short weekday) dddd (full weekday)
export function formatDate(date: Date, fmt: string): string {
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const daysShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return fmt
    .replace("YYYY", String(date.getFullYear()))
    .replace("MM", pad(date.getMonth() + 1))
    .replace("DD", pad(date.getDate()))
    .replace("HH", pad(date.getHours()))
    .replace("mm", pad(date.getMinutes()))
    .replace("ss", pad(date.getSeconds()))
    .replace("dddd", days[date.getDay()])
    .replace("ddd", daysShort[date.getDay()]);
}

// ── Auto-resolve variables that need no user input ────────────────────────────
export async function autoResolve(
  variable: SnippetVariable,
  counters: Record<string, number>,
  snippetId: string,
  envVars: Record<string, string>,
  clipboardText: string,
): Promise<string | null> {
  switch (variable.type) {
    case "current_time":
      return formatDate(new Date(), variable.format || "HH:mm");
    case "counter": {
      const key = `${snippetId}_${variable.id}`;
      const current = counters[key] ?? variable.startValue;
      counters[key] = current + variable.step;
      return String(current);
    }
    case "clipboard":
      return clipboardText;
    case "cursor_position":
      return "{{cursor}}";
    case "environment_ref":
      return envVars[variable.envKey] ?? "";
    default:
      return null; // needs user input
  }
}

// ── Apply resolved vars + env vars to template string ────────────────────────
export function applyVars(
  template: string,
  resolved: ResolvedVars,
  envVars: Record<string, string>,
): string {
  let out = template;
  // env vars
  out = out.replace(/\{\{env\.([^}]+)\}\}/g, (_, k: string) => envVars[k] ?? "");
  // snippet variables by id
  for (const [id, val] of Object.entries(resolved)) {
    out = out.replace(new RegExp(`\\{\\{${id}\\}\\}`, "g"), val);
  }
  return out;
}

// ── Check which variables need user input ─────────────────────────────────────
export function needsInput(variable: SnippetVariable): boolean {
  return ["text_input","dropdown","chained_dropdown","date","custom_time","conditional","repeating_section"].includes(variable.type);
}

// ── Build full text from snippet content blocks ───────────────────────────────
export function buildRawText(snippet: Snippet): string {
  return snippet.content.map(b => {
    if (b.type === "richtext") return b.html;
    if (b.type === "code") return b.code;
    if (b.type === "table") return b.headers.join("\t") + "\n" + b.rows.map(r => r.join("\t")).join("\n");
    if (b.type === "signature") return b.html;
    if (b.type === "html_raw") return b.html;
    if (b.type === "url_autofill") return `{{url_autofill_${b.insert}}}`;
    return "";
  }).join("\n");
}
'@

Write-File "src/content/expansion-modal.ts" @'
import type { Snippet, SnippetVariable, VarRepeatingSection } from "../core/types";
import { formatDate, needsInput, applyVars, buildRawText, autoResolve } from "../core/variables";

const MODAL_CSS = `
  :host { all: initial; }
  #sss-modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.55);
    z-index: 2147483646;
    display: flex; align-items: center; justify-content: center;
  }
  #sss-modal {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 24px 80px rgba(0,0,0,.8);
    width: 460px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    font-family: system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
    color: #e28f0; font-size: 13px; overflow: hidden;
  }
  #sss-modal-header {
    padding: 14px 18px 10px;
    border-bottom: 1px solid #334155;
    display: flex; align-items: center; gap: 8px;
  }
  #sss-modal-title { font-weight: 700; font-size: 14px; color: #818cf8; flex: 1; }
  #sss-modal-body { padding: 16px 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
  #sss-modal-footer { padding: 12px 18px; border-top: 1px solid #334155; display: flex; gap: 8px; justify-content: flex-end; }
  .sss-field { display: flex; flex-direction: column; gap: 5px; }
  .sss-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
  .sss-input {
    padding: 7px 10px; font-size: 13px; border-radius: 5px;
    border: 1px solid #334155; background: #1e293b;
    color: #e2e8f0; outline: none; width: 100%; box-sizing: border-box;
  }
  .sss-input:focus { border-color: #6366f1; }
  select.sss-input { cursor: pointer; }
  .sss-btn {
    padding: 7px 16px; font-size: 12px; border-radius: 5px;
    border: 1px solid #334155; background: #1e293b;
    color: #e2e8f0; cursor: pointer; transition: background .15s;
  }
  .sss-btn:hover { background: #334155; }
  .sss-btn-primary { background: #6366f1; border-color: #6366f1; color: #fff; }
  .sss-btn-primary:hover { background: #818cf8; }
  .sss-btn-danger { color: #ef4444; }
  .sss-repeating { border: 1px solid #334155; border-radius: 6px; overflow: hidden; }
  .sss-repeating-row { padding: 8px 10px; border-bottom: 1px solid #1e293b; display: flex; flex-direction: column; gap: 6px; position: relative; }
  .sss-repeating-row:last-child { border-bottom: none; }
  .sss-row-del { position: absolute; top: 8px; right: 8px; background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px; }
  .sss-add-row { padding: 6px; text-align: center; font-size: 12px; color: #6366f1; cursor: pointer; border-top: 1px solid #334155; background: #0f172a; }
  .sss-add-row:hover { background: #1e293b; }
  .sss-preview {
    background: #020617; border: 1px solid #1e293b; border-radius: 6px;
    padding: 10px 12px; font-size: 11px; color: #94a3b8;
    font-family: monospace; white-space: pre-wrap; word-break: break-all;
    max-height: 80px; overflow-y: auto;
  }
  .sss-preview-label { font-size: 10px; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .05em; }
`;

type RowValues = Record<string, string>;

export class ExpansionModal {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private snippet: Snippet | null = null;
  private values: Record<string, string> = {};
  private repeatRows: Record<string, RowValues[]> = {};
  private envVars: Record<string, string> = {};
  private counters: Record<string, number> = {};
  private clipboardText = "";
  private pageUrl = "";
  private pageTitle = "";
  private onDone: ((text: string, cursorOffset?: number) => void) | null = null;
  private onCancel: (() => void) | null = null;

  async open(
    snippet: Snippet,
    envVars: Record<string, string>,
    counters: Record<string, number>,
    pageUrl: string,
    pageTitle: string,
    onDone: (text: string, cursorOffset?: number) => void,
    onCancel: () => void,
  ) {
    this.snippet = snippet;
    this.envVars = envVars;
    this.counters = counters;
    this.pageUrl = pageUrl;
    this.pageTitle = pageTitle;
    this.onDone = onDone;
    this.onCancel = onCancel;
    this.values = {};
    this.repeatRows = {};

    // read clipboard
    try { this.clipboardText = await navigator.clipboard.readText(); } catch { this.clipboardText = ""; }

    // auto-resolve non-input vars
    for (const v of snippet.variables) {
      const auto = await autoResolve(v, this.counters, snippet.id, this.envVars, this.clipboardText);
      if (auto !== null) this.values[v.id] = auto;
      else if (v.type === "text_input") this.values[v.id] = v.defaultValue ?? "";
      else if (v.type === "dropdown") this.values[v.id] = v.defaultOption ?? (v.options[0] ?? "");
      else if (v.type === "chained_dropdown") this.values[v.id] = "";
      else if (v.type === "date") this.values[v.id] = formatDate(new Date(), v.format || "YYYY-MM-DD");
      else if (v.type === "custom_time") this.values[v.id] = formatDate(new Date(), v.format || "HH:mm");
      else if (v.type === "read_from_page") {
        try {
          const el = document.querySelector(v.selector);
          this.values[v.id] = el ? (el.textContent ?? "") : "";
        } catch { this.values[v.id] = ""; }
      } else if (v.type === "url_autofill") {
        this.values[v.id] = "";
      }
    }

    const inputVars = snippet.variables.filter(v => needsInput(v));
    if (inputVars.length === 0) {
      // no user input needed — resolve and insert immediately
      this.finish();
      return;
    }

    if (!this.host) this.mount();
    else this.shadow!.querySelector("#sss-modal-body")!.innerHTML = "";
    this.render();
  }

  private mount() {
    this.host = document.createElement("div");
    this.host.id = "sss-modal-host";
    Object.assign(this.host.style, { all: "initial", position: "fixed", zIndex: "2147483647", top: "0", left: "0" });
    this.shadow = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = MODAL_CSS;
    this.shadow.appendChild(style);
    document.documentElement.appendChild(this.host);

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { this.cancel(); }
    });
  }

  private render() {
    if (!this.shadow || !this.snippet) return;
    let backdrop = this.shadow.querySelector("#sss-modal-backdrop") as HTMLElement | null;
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "sss-modal-backdrop";
      backdrop.addEventListener("mousedown", e => { if (e.target === backdrop) this.cancel(); });
      this.shadow.appendChild(backdrop);
    }
    backdrop.innerHTML = "";

    const modal = document.createElement("div");
    modal.id = "sss-modal";

    const header = document.createElement("div");
    header.id = "sss-modal-header";
    header.innerHTML = `<span id="sss-modal-title">✦ ${this.snippet.name}</span>`;
    const closeBtn = document.createElement("button");
    closeBtn.className = "sss-btn";
    closeBtn.textContent = "✕";
    closeBtn.style.padding = "2px 8px";
    closeBtn.addEventListener("click", () => this.cancel());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const body = document.createElement("div");
    body.id = "sss-modal-body";

    const inputVars = this.snippet.variables.filter(v => needsInput(v));
    inputVars.forEach((v, idx) => {
      const field = document.createElement("div");
      field.className = "sss-field";
      const label = document.createElement("div");
      label.className = "sss-label";
      label.textContent = "label" in v ? v.label : v.type;
      field.appendChild(label);

      if (v.type === "text_input") {
        const el = document.createElement("input");
        el.className = "sss-input";
        el.value = this.values[v.id] ?? v.defaultValue ?? "";
        el.placeholder = v.defaultValue ?? "";
        el.addEventListener("input", () => { this.values[v.id] = el.value; this.updatePreview(); });
        if (idx === 0) requestAnimationFrame(() => el.focus());
        field.appendChild(el);
        if (v.validation) {
          const hint = document.createElement("div");
          hint.style.cssText = "font-size:10px;color:#475569;";
          hint.textContent = `Pattern: ${v.validation}`;
          field.appendChild(hint);
        }
      } else if (v.type === "dropdown") {
        const el = document.createElement("select");
        el.className = "sss-input";
        v.options.forEach(opt => {
          const o = document.createElement("option");
          o.value = opt; o.textContent = opt;
          if (opt === (this.values[v.id] ?? v.defaultOption)) o.selected = true;
          el.appendChild(o);
        });
        el.addEventListener("change", () => { this.values[v.id] = el.value; this.updateChained(v.id); this.updatePreview(); });
        field.appendChild(el);
      } else if (v.type === "chained_dropdown") {
        const parentVal = this.values[v.parentId] ?? "";
        const opts = v.optionsMap[parentVal] ?? [];
        const el = document.createElement("select");
        el.className = "sss-input";
        el.id = `sss-chained-${v.id}`;
        opts.forEach(opt => {
          const o = document.createElement("option");
          o.value = opt; o.textContent = opt;
          el.appendChild(o);
        });
        this.values[v.id] = opts[0] ?? "";
        el.addEventListener("change", () => { this.values[v.id] = el.value; this.updatePreview(); });
        field.appendChild(el);
      } else if (v.type === "date") {
        const el = document.createElement("input");
        el.type = "date"; el.className = "sss-input";
        const today = new Date();
        el.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
        el.addEventListener("change", () => {
          const d = new Date(el.value + "T12:00:00");
          this.values[v.id] = formatDate(d, v.format || "YYYY-MM-DD");
          this.updatePreview();
        });
        field.appendChild(el);
      } else if (v.type === "custom_time") {
        const el = document.createElement("input");
        el.type = "time"; el.className = "sss-input";
        el.addEventListener("change", () => {
          const [hh, mm] = el.value.split(":");
          const d = new Date(); d.setHours(Number(hh)); d.setMinutes(Number(mm));
          this.values[v.id] = formatDate(d, v.format || "HH:mm");
          this.updatePreview();
        });
        field.appendChild(el);
      } else if (v.type === "repeating_section") {
        if (!this.repeatRows[v.id]) this.repeatRows[v.id] = [this.emptyRow(v)];
        field.appendChild(this.buildRepeatSection(v));
      } else if (v.type === "conditional") {
        const el = document.createElement("select");
        el.className = "sss-input";
        ["true","false"].forEach(opt => {
          const o = document.createElement("option"); o.value = opt; o.textContent = opt; el.appendChild(o);
        });
        el.addEventListener("change", () => {
          this.values[v.id] = el.value === "true" ? v.trueContent : v.falseContent;
          this.updatePreview();
        });
        this.values[v.id] = v.trueContent;
        field.appendChild(el);
      }

      body.appendChild(field);
    });

    // preview
    const previewWrap = document.createElement("div");
    previewWrap.id = "sss-preview-wrap";
    const previewLabel = document.createElement("div");
    previewLabel.className = "sss-preview-label";
    previewLabel.textContent = "Preview";
    const preview = document.createElement("div");
    preview.className = "sss-preview";
    preview.id = "sss-preview";
    preview.textContent = this.buildPreview();
    previewWrap.appendChild(previewLabel);
    previewWrap.appendChild(preview);
    body.appendChild(previewWrap);

    modal.appendChild(body);

    const footer = document.createElement("div");
    footer.id = "sss-modal-footer";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "sss-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => this.cancel());
    const insertBtn = document.createElement("button");
    insertBtn.className = "sss-btn sss-btn-primary";
    insertBtn.textContent = "Insert";
    insertBtn.addEventListener("click", () => this.finish());
    footer.appendChild(cancelBtn);
    footer.appendChild(insertBtn);
    modal.appendChild(footer);

    backdrop.appendChild(modal);

    // keyboard: Tab/Enter/Shift+Tab handled by browser naturally in inputs
    modal.addEventListener("keydown", e => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.finish(); }
    });
  }

  private emptyRow(v: VarRepeatingSection): RowValues {
    const row: RowValues: RowValues = {};
    v.fields.forEach(f => { if ("defaultValue" in f) row[f.id] = (f as { defaultValue: string }).defaultValue ?? ""; else row[f.id] = ""; });
    return row;
  }

  private buildRepeatSection(v: VarRepeatingSection): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "sss-repeating";
    wrap.id = `sss-repeat-${v.id}`;

    const rows = this.repeatRows[v.id] ?? [];
    rows.forEach((row, rowIdx) => {
      const rowEl = document.createElement("div");
      rowEl.className = "sss-repeating-row";

      v.fields.forEach(f => {
        const lbl = document.createElement("div");
        lbl.className = "sss-label";
        lbl.textContent = "label" in f ? (f as { label: string }).label : f.id;
        const el = document.createElement("input");
        el.className = "sss-input";
        el.value = row[f.id] ?? "";
        el.style.fontSize = "12px";
        el.addEventListener("input", () => {
          this.repeatRows[v.id][rowIdx][f.id] = el.value;
          this.updatePreview();
        });
        rowEl.appendChild(lbl);
        rowEl.appendChild(el);
      });

      const delBtn = document.createElement("button");
      delBtn.className = "sss-row-del";
      delBtn.textContent = "✕";
      delBtn.title = "Remove row";
      delBtn.addEventListener("click", () => {
        this.repeatRows[v.id].splice(rowIdx, 1);
        this.reRenderRepeat(v);
        this.updatePreview();
      });
      rowEl.appendChild(delBtn);
      wrap.appendChild(rowEl);
    });

    const addRow = document.createElement("div");
    addRow.className = "sss-add-row";
    addRow.textContent = "+ Add row";
    addRow.addEventListener("click", () => {
      this.repeatRows[v.id].push(this.emptyRow(v));
      this.reRenderRepeat(v);
      this.updatePreview();
    });
    wrap.appendChild(addRow);
    return wrap;
  }

  private reRenderRepeat(v: VarRepeatingSection) {
    if (!this.shadow) return;
    const existing = this.shadow.querySelector(`#sss-repeat-${v.id}`);
    if (existing) existing.replaceWith(this.buildRepeatSection(v));
  }

  private updateChained(parentId: string) {
    if (!this.snippet || !this.shadow) return;
    this.snippet.variables.forEach(v => {
      if (v.type === "chained_dropdown" && v.parentId === parentId) {
        const parentVal = this.values[parentId] ?? "";
        const opts = v.optionsMap[parentVal] ?? [];
        const el = this.shadow!.querySelector(`#sss-chained-${v.id}`) as HTMLSelectElement | null;
        if (el) {
          el.innerHTML = "";
          opts.forEach(opt => {
            const o = document.createElement("option");
            o.value = opt; o.textContent = opt; el.appendChild(o);
          });
          this.values[v.id] = opts[0] ?? "";
        }
      }
    });
  }

  private buildPreview(): string {
    if (!this.snippet) return "";
    const raw = buildRawText(this.snippet);
    const repeatResolved = this.resolveRepeating(raw);
    const withVars = applyVars(repeatResolved, this.values, this.envVars);
    return withVars
      .replace(/\{\{url_autofill_url\}\}/g, this.pageUrl)
      .replace(/\{\{url_autofill_title\}\}/g, this.pageTitle)
      .replace(/\{\{cursor\}\}/g, "|cursor|")
      .slice(0, 300);
  }

  private resolveRepeating(template: string): string {
    if (!this.snippet) return template;
    let out = template;
    this.snippet.variables.forEach(v => {
      if (v.type === "repeating_section") {
        const rows = this.repeatRows[v.id] ?? [];
        const fieldIds = v.fields.map(f => f.id);
        const rowTexts = rows.map(row =>
          fieldIds.map(id => row[id] ?? "").join(" ")
        ).join("\n");
        out = out.replace(new RegExp(`\\{\\{${v.id}\\}\\}`, "g"), rowTexts);
      }
    });
    return out;
  }

  private updatePreview() {
    if (!this.shadow) return;
    const el = this.shadow.querySelector("#sss-preview");
    if (el) el.textContent = this.buildPreview();
  }

  private finish() {
    if (!this.snippet) return;
    const raw = buildRawText(this.snippet);
    const repeatResolved = this.resolveRepeating(raw);
    let text = applyVars(repeatResolved, this.values, this.envVars);
    text = text
      .replace(/\{\{url_autofill_url\}\}/g, this.pageUrl)
      .replace(/\{\{url_autofill_title\}\}/g, this.pageTitle);
    const cursorIdx = text.indexOf("{{cursor}}");
    const cleanText = text.replace("{{cursor}}", "");
    this.close();
    this.onDone?.(cleanText, cursorIdx >= 0 ? cursorIdx : undefined);
  }

  private cancel() {
    this.close();
    this.onCancel?.();
  }

  close() {
    this.host?.remove();
    this.host = null;
    this.shadow = null;
  }
}
'@

Write-Host "Task 7 expansion modal done."
Write-Host "Writing Task 8: automation engine..."

Write-File "src/content/automation.ts" @'
import type { AutomationStep } from "../core/types";

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getElement(selector: string, root: Document | Element = document): Element | null {
  try { return root.querySelector(selector); } catch { return null; }
}

export async function runAutomation(steps: AutomationStep[]): Promise<{ ok: boolean; error?: string }> {
  let iframeRoot: Document = document;

  for (const step of steps) {
    try {
      switch (step.type) {
        case "wait":
          await wait(step.ms);
          break;

        case "keypress": {
          const target = document.activeElement ?? document.body;
          const init: KeyboardEventInit = {
            key: step.key, bubbles: true, cancelable: true,
            ctrlKey: step.modifiers?.includes("ctrl"),
            shiftKey: step.modifiers?.includes("shift"),
            altKey: step.modifiers?.includes("alt"),
            metaKey: step.modifiers?.includes("meta"),
          };
          target.dispatchEvent(new KeyboardEvent("keydown", init));
          target.dispatchEvent(new KeyboardEvent("keyup", init));
          break;
        }

        case "mouse_click": {
          const el = getElement(step.selector, iframeRoot) as HTMLElement | null;
          if (!el) return { ok: false, error: `mouse_click: element not found: ${step.selector}` };
          el.click();
          el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          break;
        }

        case "input_data": {
          const el = getElement(step.selector, iframeRoot) as HTMLInputElement | HTMLTextAreaElement | null;
          if (!el) return { ok: false, error: `input_data: element not found: ${step.selector}` };
          const nativeSetter = Object.getOwnPropertyDescriptor(
            el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value"
          )?.set;
          if (nativeSetter) nativeSetter.call(el, step.value);
          else el.value = step.value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          break;
        }

        case "scroll_to": {
          const el = getElement(step.selector, iframeRoot);
          if (!el) return { ok: false, error: `scroll_to: element not found: ${step.selector}` };
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await wait(300);
          break;
        }

        case "assert": {
          const el = getElement(step.selector, iframeRoot);
          if (!el) return { ok: false, error: `assert: element not found: ${step.selector}` };
          const actual = el.textContent?.trim() ?? "";
          if (!actual.includes(step.expected)) {
            return { ok: false, error: `assert failed: expected "${step.expected}", got "${actual}"` };
          }
          break;
        }

        case "iframe_target": {
          const iframe = getElement(step.selector) as HTMLIFrameElement | null;
          if (!iframe?.contentDocument) return { ok: false, error: `iframe_target: iframe not found or cross-origin: ${step.selector}` };
          iframeRoot = iframe.contentDocument;
          break;
        }

        case "webhook": {
          const res = await fetch(step.url, {
            method: step.method,
            headers: { "Content-Type": "application/json" },
            body: step.method === "POST" && step.body ? step.body : undefined,
          });
          if (!res.ok) return { ok: false, error: `webhook: HTTP ${res.status}` };
          break;
        }

        default:
          break;
      }
    } catch (e) {
      return { ok: false, error: `Step "${(step as { type: string }).type}" threw: ${String(e)}` };
    }
  }
  return { ok: true };
}
'@

Write-Host "Task 8 automation done."
Write-Host "Writing Task 9: import/export + version history..."

Write-File "src/core/versioning.ts" @'
import type { Snippet, SnippetVersion } from "./types";
import { generateId } from "./id";

const MAX_VERSIONS = 20;

export function saveVersion(snippet: Snippet): Snippet {
  const version: SnippetVersion = {
    id: generateId(),
    savedAt: Date.now(),
    content: structuredClone(snippet.content),
    variables: structuredClone(snippet.variables),
  };
  const versions = [version, ...(snippet.versions ?? [])].slice(0, MAX_VERSIONS);
  return { ...snippet, versions };
}

export function restoreVersion(snippet: Snippet, versionId: string): Snippet {
  const version = snippet.versions.find(v => v.id === versionId);
  if (!version) return snippet;
  return saveVersion({
    ...snippet,
    content: structuredClone(version.content),
    variables: structuredClone(version.variables),
    updatedAt: Date.now(),
  });
}
'@

Write-File "src/core/importexport.ts" @'
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
'@

Write-Host "Task 9 versioning + import/export done."
Write-Host "Writing Task 10: README + updated background + wiring..."

Write-File "src/background/index.ts" @'
import browser from "webextension-polyfill";
import { readData, writeData } from "../core/storage";
import { DEFAULT_DATA } from "../core/defaults";

async function init() {
  console.log("[SSS] background initialising");
  const data = await readData();
  if (!data.version) {
    await writeData({ ...DEFAULT_DATA, ...data });
    console.log("[SSS] storage bootstrapped");
  }
}

void init();

browser.runtime.onInstalled.addListener(async () => {
  console.log("[SSS] extension installed/updated");
  await init();
  // Inject content script into all existing tabs on install
  try {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith("about:") && !tab.url.startsWith("chrome:") && !tab.url.startsWith("moz-extension:")) {
        await browser.tabs.executeScript?.(tab.id, { file: "content.js" }).catch(() => {/* tab may reject */});
      }
    }
  } catch { /* MV3 uses scripting API instead */ }
});

browser.runtime.onMessage.addListener((message, sender) => {
  const msg = message as { type: string; payload?: unknown };

  if (msg.type === "SSS_PING") {
    return Promise.resolve({ type: "SSS_PONG", timestamp: Date.now(), version: browser.runtime.getManifest().version });
  }

  if (msg.type === "SSS_GET_DATA") {
    return readData().then(data => ({ type: "SSS_DATA", payload: data }));
  }

  if (msg.type === "SSS_GET_SETTINGS") {
    return readData().then(data => ({ type: "SSS_SETTINGS", payload: data.settings }));
  }

  if (msg.type === "SSS_WRITE_DATA") {
    return writeData(msg.payload as Parameters<typeof writeData>[0]).then(() => ({ type: "SSS_OK" }));
  }

  return undefined;
});

// Context menu
browser.contextMenus?.create({
  id: "sss-open-palette",
  title: "SnippetySnipSnip — Insert snippet",
  contexts: ["editable"],
});

browser.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "sss-open-palette" && tab?.id) {
    await browser.tabs.sendMessage(tab.id, { type: "SSS_OPEN_PALETTE" }).catch(() => {});
  }
});
'@

Write-File "README.md" @'
# ✦ SnippetySnipSnip (SSS / Snippy / Snippety)

A production-ready, local-first browser extension for text snippets, templates,
nested folders, variables, and automation. Works on Firefox, Chrome, Edge, and
Chromium-based browsers.

---

## Quick start

### Prerequisites
- Node.js 20+
- npm 10+

### Install dependencies
```bash
npm install
```

### Build for Firefox
```powershell
$env:MODE="firefox"
npm run build
```

### Build for Chrome / Edge / Comet
```powershell
$env:MODE="chrome"
npm run build
```

### Run in Firefox (web-ext, no pre-existing profile needed)
```powershell
$env:MODE="firefox"
npm run build
npx web-ext run --source-dir dist-firefox
```

### Load in Chrome / Edge / Comet
1. Build for chrome (above)
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode**
4. Click **Load unpacked** → select `dist-chrome`

---

## Project structure
src/
background/ # Background service worker / persistent background script
content/ # Content script — injection, triggers, palette, modal, automation
core/ # Shared data model, storage, factories, variable engine
popup/ # Popup React UI — snippet list, search, insert
options/ # Options page React UI — settings, env vars, import/export
manifests/
manifest.firefox.json
manifest.chrome.json

---

## Features

- Nested folders with unlimited depth
- Rich snippet content: richtext, code, table, signature, raw HTML, URL autofill
- Full variable engine: text input, dropdown, chained dropdown, date, time,
  counter, clipboard, read from page, conditional, repeating section,
  cursor position, environment refs
- Inline `/trigger` expansion in any text field or contenteditable
- Shadow DOM command palette with fuzzy search and keyboard navigation
- Expansion modal with live preview, Tab/Enter/Esc navigation
- Automation steps: keypress, click, input, scroll, wait, assert, iframe, webhook
- Favorites, tags, usage counters, snippet locking, site whitelist/blacklist
- Version history with restore (up to 20 versions per snippet)
- Import / export JSON backup
- Environment variables ({{env.key}})
- Dark / light / system theme
- Optional browser.storage.sync toggle
- Fully offline — no backend required
- No chrome.* calls — uses webextension-polyfill (browser.*) everywhere

---

## Dependency management

Check for vulnerabilities at any time:
```bash
npm audit
```

Update dependencies safely:
```bash
npm outdated
npm update <package-name>
```

For major version bumps always check the changelog before updating.
The lockfile (`package-lock.json`) is committed — always run `npm ci` in CI
environments for reproducible installs.

---

## Security notes

- All injected UI runs inside Shadow DOM — fully isolated from host pages
- No data is ever sent to any server unless you configure a self-hosted backend
- The self-hosted backend URL is optional and disabled by default
- browser.storage.sync is opt-in only
'@

Write-File "src/popup/popup.html" @'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>SnippetySnipSnip</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #0f172a; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
'@

Write-File "src/options/options.html" @'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>SnippetySnipSnip — Settings</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #0f172a; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
'@

Write-File "src/global.d.ts" @'
declare const __FIREFOX__: boolean;
declare const __DEV__: boolean;
declare const __VERSION__: string;
'@

# ── git add, commit, push ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "Staging all changes..."
git add -A

Write-Host "Committing tasks 3-10..."
git commit -m "feat(tasks-3-10): full popup UI, insertion, settings, palette, variable engine, automation, versioning, import/export, README"

Write-Host "Pushing to GitHub..."
git push

Write-Host ""
Write-Host "Done! All tasks 3-10 pushed to GitHub."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  git pull  (if running on another machine)"
Write-Host "  `$env:MODE='firefox'; npm run build"
Write-Host "  npx web-ext run --source-dir dist-firefox"