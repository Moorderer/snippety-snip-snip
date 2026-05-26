import browser from 'webextension-polyfill';
import type { SSSData, SSSSettings, TreeNode, Snippet, Folder, EnvVars } from './types';
import { DEFAULT_DATA } from './defaults';

const STORAGE_KEY = 'sss_data';

// ─── Read/Write ───────────────────────────────────────────────────────────────

export async function readData(): Promise<SSSData> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY];
  if (!raw) return structuredClone(DEFAULT_DATA);
  // Basic migration: if version missing, treat as v1
  const data = raw as Partial<SSSData>;
  return {
    ...DEFAULT_DATA,
    ...data,
    settings: { ...DEFAULT_DATA.settings, ...(data.settings ?? {}) },
  };
}

export async function writeData(data: SSSData): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: data });
}

export async function updateSettings(partial: Partial<SSSSettings>): Promise<SSSData> {
  const data = await readData();
  data.settings = { ...data.settings, ...partial };
  await writeData(data);
  return data;
}

export async function updateEnvVars(envVars: EnvVars): Promise<void> {
  const data = await readData();
  data.settings.envVars = envVars;
  await writeData(data);
}

// ─── Tree Helpers ─────────────────────────────────────────────────────────────

export function findNodeById(tree: TreeNode[], id: string): TreeNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.type === 'folder') {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParentOf(tree: TreeNode[], id: string): Folder | null {
  for (const node of tree) {
    if (node.type === 'folder') {
      if (node.children.some((c) => c.id === id)) return node;
      const found = findParentOf(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function removeNodeById(tree: TreeNode[], id: string): TreeNode[] {
  return tree
    .filter((n) => n.id !== id)
    .map((n) => {
      if (n.type === 'folder') {
        return { ...n, children: removeNodeById(n.children, id) };
      }
      return n;
    });
}

export function insertNode(
  tree: TreeNode[],
  node: TreeNode,
  parentId: string | null,
): TreeNode[] {
  if (!parentId) return [...tree, node];
  return tree.map((n) => {
    if (n.type === 'folder' && n.id === parentId) {
      return { ...n, children: [...n.children, node] };
    }
    if (n.type === 'folder') {
      return { ...n, children: insertNode(n.children, node, parentId) };
    }
    return n;
  });
}

export function updateNode(
  tree: TreeNode[],
  id: string,
  updater: (n: TreeNode) => TreeNode,
): TreeNode[] {
  return tree.map((n) => {
    if (n.id === id) return updater(n);
    if (n.type === 'folder') {
      return { ...n, children: updateNode(n.children, id, updater) };
    }
    return n;
  });
}

export function flattenSnippets(tree: TreeNode[]): Snippet[] {
  const result: Snippet[] = [];
  for (const node of tree) {
    if (node.type === 'snippet') result.push(node);
    else result.push(...flattenSnippets(node.children));
  }
  return result;
}

// ─── Snippet CRUD ─────────────────────────────────────────────────────────────

export async function saveSnippet(
  snippet: Snippet,
  parentId: string | null = null,
): Promise<void> {
  const data = await readData();
  const existing = findNodeById(data.tree, snippet.id);
  if (existing) {
    data.tree = updateNode(data.tree, snippet.id, () => snippet);
  } else {
    data.tree = insertNode(data.tree, snippet, parentId);
  }
  await writeData(data);
}

export async function deleteNode(id: string): Promise<void> {
  const data = await readData();
  data.tree = removeNodeById(data.tree, id);
  await writeData(data);
}

export async function saveFolder(
  folder: Folder,
  parentId: string | null = null,
): Promise<void> {
  const data = await readData();
  const existing = findNodeById(data.tree, folder.id);
  if (existing) {
    data.tree = updateNode(data.tree, folder.id, () => folder);
  } else {
    data.tree = insertNode(data.tree, folder, parentId);
  }
  await writeData(data);
}

export async function incrementUsage(snippetId: string): Promise<void> {
  const data = await readData();
  data.tree = updateNode(data.tree, snippetId, (n) => {
    if (n.type !== 'snippet') return n;
    return { ...n, usageCount: n.usageCount + 1 };
  });
  await writeData(data);
}

export async function resetCounters(): Promise<void> {
  const data = await readData();
  data.counters = {};
  await writeData(data);
}

// ─── Export / Import ─────────────────────────────────────────────────────────

export async function exportAll(): Promise<string> {
  const data = await readData();
  return JSON.stringify(data, null, 2);
}

export async function importAll(json: string): Promise<void> {
  const parsed = JSON.parse(json) as Partial<SSSData>;
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid SSS export JSON');
  const merged: SSSData = {
    ...DEFAULT_DATA,
    ...parsed,
    settings: { ...DEFAULT_DATA.settings, ...(parsed.settings ?? {}) },
    version: 1,
  };
  await writeData(merged);
}
