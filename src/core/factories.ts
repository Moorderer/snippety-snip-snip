import type { Snippet, Folder } from './types';
import { uid } from './id';

export function makeSnippet(overrides: Partial<Snippet> = {}): Snippet {
  const now = Date.now();
  return {
    id: uid(),
    type: 'snippet',
    name: 'Untitled Snippet',
    trigger: '',
    tags: [],
    content: [{ type: 'richtext', html: '' }],
    variables: [],
    automation: [],
    siteWhitelist: [],
    locked: false,
    usageCount: 0,
    versions: [],
    favorite: false,
    bundle: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeFolder(overrides: Partial<Folder> = {}): Folder {
  const now = Date.now();
  return {
    id: uid(),
    type: 'folder',
    name: 'New Folder',
    children: [],
    collapsed: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
