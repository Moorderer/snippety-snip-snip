import browser from "webextension-polyfill";

// â”€â”€ Shadow DOM host â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Find the active editable element â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getActiveEditable(): HTMLElement | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return el;
  if (el.isContentEditable) return el;
  return null;
}

// â”€â”€ Insert text into a native input/textarea â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Insert into contenteditable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Resolve env vars in text â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function resolveEnvVars(text: string): Promise<string> {
  const { sss_data } = await browser.storage.local.get("sss_data") as { sss_data?: { settings?: { envVars?: Record<string, string> } } };
  const envVars = sss_data?.settings?.envVars ?? {};
  return text.replace(/\{\{env\.([^}]+)\}\}/g, (_, key: string) => envVars[key] ?? "");
}

// â”€â”€ Trigger detection (/trigger in text fields) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Global keyup listener for trigger detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener("keyup", (e: KeyboardEvent) => {
  const el = e.target as HTMLElement;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    void handleTriggerInput(el as HTMLInputElement | HTMLTextAreaElement);
  }
}, true);

// â”€â”€ Message listener â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    badge.textContent = "âœ¦ SnippetySnipSnip ready";
    sr.appendChild(badge);
    setTimeout(() => { badge.style.opacity = "0"; setTimeout(() => badge.remove(), 400); }, 2000);
  }

  return undefined;
});

// Announce readiness
void browser.runtime.sendMessage({ type: "SSS_PING" }).catch(() => {/* bg not ready yet */});