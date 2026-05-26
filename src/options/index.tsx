import React from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    padding: 24,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    backgroundColor: '#020617',
    color: '#e2e8f0',
    maxWidth: 640,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#a5b4fc',
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
  },
  card: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  value: {
    fontSize: 13,
    fontWeight: 500,
    color: '#86efac',
    fontFamily: 'monospace',
  },
};

function App() {
  const [data, setData] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const res = await browser.storage.local.get(['sss_installed', 'sss_version']);
      setData(res as Record<string, unknown>);
    };
    void load();
  }, []);

  return (
    <div style={styles['root']}>
      <div style={styles['title']}>✂️ SnippetySnipSnip</div>
      <div style={styles['sub']}>Settings — task 1 skeleton. Full settings will appear in a later task.</div>

      <div style={styles['card']}>
        <div style={styles['label']}>Installed flag (storage)</div>
        <div style={styles['value']}>
          {data === null ? 'Loading…' : JSON.stringify(data)}
        </div>
      </div>

      <div style={styles['card']}>
        <div style={styles['label']}>Extension build info</div>
        <div style={styles['value']}>
          {/* __VERSION__ injected by Vite define */}
          version: {typeof __VERSION__ !== 'undefined' ? (globalThis as unknown as Record<string, string>)['__VERSION__'] ?? 'dev' : 'dev'}
        </div>
      </div>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) ReactDOM.createRoot(rootEl).render(<App />);
