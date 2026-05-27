import type { SnippetVariable, Snippet } from "./types";

export interface ResolvedVars { [varId: string]: string }

// â”€â”€ Format a date using a simple format string â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Auto-resolve variables that need no user input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Apply resolved vars + env vars to template string â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Check which variables need user input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function needsInput(variable: SnippetVariable): boolean {
  return ["text_input","dropdown","chained_dropdown","date","custom_time","conditional","repeating_section"].includes(variable.type);
}

// â”€â”€ Build full text from snippet content blocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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