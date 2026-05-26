// ─── Core Data Model ────────────────────────────────────────────────────────

export type BlockType = 'richtext' | 'code' | 'table' | 'signature' | 'html_raw' | 'url_autofill';

export interface RichTextBlock { type: 'richtext'; html: string; }
export interface CodeBlock { type: 'code'; language: string; code: string; }
export interface TableBlock { type: 'table'; headers: string[]; rows: string[][]; }
export interface SignatureBlock { type: 'signature'; html: string; }
export interface HtmlRawBlock { type: 'html_raw'; html: string; }
export interface UrlAutofillBlock { type: 'url_autofill'; insert: 'url' | 'title'; }

export type ContentBlock =
  | RichTextBlock
  | CodeBlock
  | TableBlock
  | SignatureBlock
  | HtmlRawBlock
  | UrlAutofillBlock;

// ─── Variables ───────────────────────────────────────────────────────────────

export interface VarTextInput {
  id: string; type: 'text_input'; label: string; defaultValue: string; validation?: string;
}
export interface VarDropdown {
  id: string; type: 'dropdown'; label: string; options: string[]; defaultOption: string;
}
export interface VarChainedDropdown {
  id: string; type: 'chained_dropdown'; label: string; parentId: string;
  optionsMap: Record<string, string[]>;
}
export interface VarDate {
  id: string; type: 'date'; label: string; includeYear: boolean;
  includeWeekday: boolean; weekdayPosition: 'before' | 'after';
  format: string;
}
export interface VarCurrentTime {
  id: string; type: 'current_time'; label: string; format: string;
}
export interface VarCustomTime {
  id: string; type: 'custom_time'; label: string; format: string;
}
export interface VarCounter {
  id: string; type: 'counter'; label: string; startValue: number; step: number;
}
export interface VarClipboard {
  id: string; type: 'clipboard'; label: string;
}
export interface VarReadFromPage {
  id: string; type: 'read_from_page'; label: string; selector: string;
}
export interface VarConditional {
  id: string; type: 'conditional'; label: string;
  condition: string; trueContent: string; falseContent: string;
}
export interface VarRepeatingSection {
  id: string; type: 'repeating_section'; label: string;
  fields: SnippetVariable[];
}
export interface VarCursorPosition {
  id: string; type: 'cursor_position';
}
export interface VarEnvironmentRef {
  id: string; type: 'environment_ref'; label: string; envKey: string;
}

export type SnippetVariable =
  | VarTextInput | VarDropdown | VarChainedDropdown | VarDate
  | VarCurrentTime | VarCustomTime | VarCounter | VarClipboard
  | VarReadFromPage | VarConditional | VarRepeatingSection
  | VarCursorPosition | VarEnvironmentRef;

// ─── Automation ───────────────────────────────────────────────────────────────

export interface AutoKeypress { type: 'keypress'; key: string; modifiers?: string[]; }
export interface AutoMouseClick { type: 'mouse_click'; selector: string; }
export interface AutoInputData { type: 'input_data'; selector: string; value: string; }
export interface AutoScrollTo { type: 'scroll_to'; selector: string; }
export interface AutoWait { type: 'wait'; ms: number; }
export interface AutoAssert { type: 'assert'; selector: string; expected: string; }
export interface AutoIframeTarget { type: 'iframe_target'; selector: string; }
export interface AutoWebhook { type: 'webhook'; url: string; method: 'GET' | 'POST'; body?: string; }

export type AutomationStep =
  | AutoKeypress | AutoMouseClick | AutoInputData | AutoScrollTo
  | AutoWait | AutoAssert | AutoIframeTarget | AutoWebhook;

// ─── Snippet Version ──────────────────────────────────────────────────────────

export interface SnippetVersion {
  id: string;
  savedAt: number;
  content: ContentBlock[];
  variables: SnippetVariable[];
}

// ─── Snippet Node ─────────────────────────────────────────────────────────────

export interface Snippet {
  id: string;
  type: 'snippet';
  name: string;
  trigger: string;
  tags: string[];
  content: ContentBlock[];
  variables: SnippetVariable[];
  automation: AutomationStep[];
  siteWhitelist: string[];
  locked: boolean;
  usageCount: number;
  versions: SnippetVersion[];
  favorite: boolean;
  bundle: string[];
  createdAt: number;
  updatedAt: number;
}

// ─── Folder Node ─────────────────────────────────────────────────────────────

export interface Folder {
  id: string;
  type: 'folder';
  name: string;
  children: TreeNode[];
  collapsed: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TreeNode = Folder | Snippet;

// ─── Environment Variables ────────────────────────────────────────────────────

export type EnvVars = Record<string, string>;

// ─── Settings ────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system';
export type StorageMode = 'local' | 'sync';

export interface SSSSettings {
  theme: Theme;
  triggerPrefix: string;
  globalShortcutEnabled: boolean;
  siteBlacklist: string[];
  storageMode: StorageMode;
  syncEnabled: boolean;
  selfHostedBackendUrl: string;
  envVars: EnvVars;
}

// ─── Root Storage Object ──────────────────────────────────────────────────────

export interface SSSData {
  version: number;
  tree: TreeNode[];
  settings: SSSSettings;
  counters: Record<string, number>; // snippetId → current counter value
}
