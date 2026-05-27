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