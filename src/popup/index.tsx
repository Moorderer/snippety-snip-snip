import React from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: 300,
    minHeight: 160,
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  logo: {
    fontSize: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: '#a5b4fc',
  },
  sub: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 16,
  },
  btn: {
    padding: '6px 12px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#e2e8f0',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  pre: {
    marginTop: 10,
    fontSize: 11,
    background: '#020617',
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #1e293b',
    maxHeight: 100,
    overflow: 'auto',
    color: '#86efac',
    fontFamily: 'monospace',
  },
};

function App() {
  const [status, setStatus] = React.useState<'idle' | 'pinging' | 'done' | 'error'>('idle');
  const [result, setResult] = React.useState<string | null>(null);

  const ping = async () => {
    try {
      setStatus('pinging');
      const res = await browser.runtime.sendMessage({ type: 'SSS_PING' });
      setResult(JSON.stringify(res, null, 2));
      setStatus('done');
    } catch (err) {
      setResult(String(err));
      setStatus('error');
    }
  };

  return (
    <div style={styles['root']}>
      <div style={styles['header']}>
        <span style={styles['logo']}>✂️</span>
        <span style={styles['title']}>SnippetySnipSnip</span>
      </div>
      <p style={styles['sub']}>Task 1 skeleton — popup is alive.</p>
      <button
        type="button"
        style={styles['btn']}
        onClick={() => { void ping(); }}
        disabled={status === 'pinging'}
      >
        {status === 'pinging' ? 'Pinging…' : '🔁 Ping background'}
      </button>
      {result && <pre style={styles['pre']}>{result}</pre>}
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) ReactDOM.createRoot(rootEl).render(<App />);
