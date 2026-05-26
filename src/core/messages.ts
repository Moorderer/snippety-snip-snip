// Typed message protocol between background, content, and popup

export type BgMessage =
  | { type: 'SSS_PING' }
  | { type: 'SSS_GET_DATA' }
  | { type: 'SSS_GET_SETTINGS' };

export type BgResponse =
  | { type: 'SSS_PONG'; timestamp: number; version: string }
  | { type: 'SSS_DATA'; payload: unknown }
  | { type: 'SSS_SETTINGS'; payload: unknown }
  | { type: 'SSS_ERROR'; message: string };

export type ContentMessage =
  | { type: 'SSS_SHOW_BADGE' }
  | { type: 'SSS_INSERT'; text: string; cursorOffset?: number }
  | { type: 'SSS_GET_PAGE_INFO' };

export type ContentResponse =
  | { type: 'SSS_PAGE_INFO'; url: string; title: string }
  | { type: 'SSS_INSERT_OK' }
  | { type: 'SSS_ERROR'; message: string };
