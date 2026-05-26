import browser from 'webextension-polyfill';

(async () => {
  console.warn('[SSS] background script starting');

  const existing = await browser.storage.local.get('sss_installed');
  if (!existing['sss_installed']) {
    await browser.storage.local.set({ sss_installed: true, sss_version: __VERSION__ });
  }

  browser.runtime.onMessage.addListener((message, _sender) => {
    const msg = message as { type?: string };
    if (msg?.type === 'SSS_PING') {
      return Promise.resolve({ type: 'SSS_PONG', timestamp: Date.now(), version: __VERSION__ });
    }
    return undefined;
  });
})();

export {};
