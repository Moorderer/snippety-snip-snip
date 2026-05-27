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
        <span style={{ opacity: 0.6, fontSize: 11 }}>{isSnip ? "âœ¦" : open ? "â–¾" : "â–¸"}</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isSnip && (node as Snippet).favorite && <span style={{ color: C.yellow, marginRight: 3 }}>â˜…</span>}
          {node.name}
        </span>
        {isSnip && (
          <span style={{ display: "flex", gap: 4, opacity: sel ? 1 : 0.4 }}>
            <span title="Favourite" onClick={e => { e.stopPropagation(); onToggleFav(node.id); }} style={{ cursor: "pointer", fontSize: 11 }}>â˜…</span>
            <span title="Delete" onClick={e => { e.stopPropagation(); onDelete(node.id); }} style={{ cursor: "pointer", color: C.danger, fontSize: 11 }}>âœ•</span>
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
        <span style={{ fontSize: 15 }}>âœ¦</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: C.accentHover, letterSpacing: "-.02em" }}>SnippetySnipSnip</span>
        <span style={{ flex: 1 }} />
        <button style={btn({ padding: "2px 7px", fontSize: 11 })} onClick={() => setView(v => v === "list" ? "tree" : "list")} title="Toggle view">{view === "list" ? "ðŸŒ²" : "â˜°"}</button>
        <button style={btn({ padding: "2px 7px", fontSize: 11 })} onClick={newFolder} title="New folder">ðŸ“</button>
        <button style={btn({ padding: "2px 7px", fontSize: 11, background: C.accent, border: "none", color: "#fff" })} onClick={() => setEditing(createSnippet("", ""))}>+ New</button>
        <button style={btn({ padding: "2px 7px", fontSize: 11 })} onClick={() => browser.runtime.openOptionsPage()} title="Settings">âš™</button>
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
              placeholder="Search snippetsâ€¦ (fuzzy)"
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
                        {s.favorite && <span style={{ color: C.yellow, marginRight: 3 }}>â˜…</span>}
                        {s.name}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                        {s.trigger && <span style={{ marginRight: 6, color: C.accent }}>{s.trigger}</span>}
                        {s.tags.map(t => (
                          <span key={t} style={{ marginRight: 4, background: C.surface, borderRadius: 3, padding: "1px 4px", fontSize: 10 }}>{t}</span>
                        ))}
                        {s.usageCount > 0 && <span style={{ color: C.muted, marginLeft: 4 }}>â†‘{s.usageCount}</span>}
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
                      >âœŽ</button>
                      <button
                        style={btn({ padding: "2px 7px", fontSize: 11 })}
                        onClick={e => { e.stopPropagation(); void handleToggleFav(s.id); }}
                        title="Toggle favourite"
                      >{s.favorite ? "â˜…" : "â˜†"}</button>
                      <button
                        style={btn({ padding: "2px 7px", fontSize: 11, color: C.danger })}
                        onClick={e => { e.stopPropagation(); void handleDelete(s.id); }}
                        title="Delete"
                      >âœ•</button>
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