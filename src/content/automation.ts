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