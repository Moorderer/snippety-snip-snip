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
      // no user input needed â€” resolve and insert immediately
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
    header.innerHTML = `<span id="sss-modal-title">âœ¦ ${this.snippet.name}</span>`;
    const closeBtn = document.createElement("button");
    closeBtn.className = "sss-btn";
    closeBtn.textContent = "âœ•";
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
      delBtn.textContent = "âœ•";
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