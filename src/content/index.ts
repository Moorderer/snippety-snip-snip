import browser from 'webextension-polyfill';

const HOST_ID = 'sss-root-host';

function ensureShadowRoot(): ShadowRoot {
  const existing = document.querySelector<HTMLDivElement>(`#${HOST_ID}`);
  if (existing?.shadowRoot) return existing.shadowRoot;

  const host = document.createElement('div');
  host.id = HOST_ID;
  Object.assign(host.style, {
    all: 'initial',
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: '2147483647',
    pointerEvents: 'none',
  });

  const shadow = host.attachShadow({ mode: 'open' });

  const badge = document.createElement('div');
  badge.textContent = 'Snippety ready';
  Object.assign(badge.style, {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '999px',
    background: 'rgba(17,24,39,0.85)',
    color: '#a5b4fc',
    border: '1px solid #4f46e5',
    backdropFilter: 'blur(4px)',
    transition: 'opacity 0.3s',
  });

  shadow.appendChild(badge);
  document.documentElement.appendChild(host);

  // Auto-hide after 3 seconds
  setTimeout(() => {
    badge.style.opacity = '0';
    setTimeout(() => host.remove(), 400);
  }, 3000);

  return shadow;
}

browser.runtime.onMessage.addListener((message) => {
  const msg = message as { type?: string };
  if (msg?.type === 'SSS_SHOW_BADGE') ensureShadowRoot();
  return undefined;
});

ensureShadowRoot();

export {};
