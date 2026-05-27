import browser from "webextension-polyfill";
import type { Snippet, TreeNode, Folder } from "../core/types";

// â”€â”€ flatten tree to snippets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function flatSnippets(tree: TreeNode[]): Snippet[] {
  const out: Snippet[] = [];
  for (const node of tree) {
    if (node.type === "snippet") out.push(node);
    else out.push(...flatSnippets((node as Folder).children));
  }
  return out;
}

// â”€â”€ fuzzy match â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function fuzzy(needle: string, haystack: string): boolean {
  if (!needle) return true;
  const n = needle.toLowerCase(), h = haystack.toLowerCase();
  let ni = 0;
  for (let i = 0; i < h.length && ni < n.length; i++) if (h[i] === n[ni]) ni++;
  return ni === n.length;
}

// â”€â”€ styles injected into shadow DOM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    this.input.placeholder = "Search snippetsâ€¦";
    this.input.addEventListener("input", () => this.render());
    this.input.addEventListener("keydown", e => this.handleKey(e));
    palette.appendChild(this.input);

    this.list = document.createElement("div");
    this.list.id = "sss-list";
    palette.appendChild(this.list);

    const footer = document.createElement("div");
    footer.id = "sss-footer";
    footer.innerHTML = "<span><kbd>â†‘â†“</kbd> navigate</span><span><kbd>Enter</kbd> insert</span><span><kbd>Esc</kbd> close</span>";
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
        ${s.favorite ? '<span class="sss-item-fav">â˜…</span>' : ""}
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