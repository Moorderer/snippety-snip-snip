import type { SSSData, SSSSettings } from './types';

export const DEFAULT_SETTINGS: SSSSettings = {
  theme: 'system',
  triggerPrefix: '/',
  globalShortcutEnabled: true,
  siteBlacklist: [],
  storageMode: 'local',
  syncEnabled: false,
  selfHostedBackendUrl: '',
  envVars: {},
};

export const DEFAULT_DATA: SSSData = {
  version: 1,
  tree: [],
  settings: DEFAULT_SETTINGS,
  counters: {},
};
