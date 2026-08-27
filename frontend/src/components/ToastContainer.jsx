import { useState, useCallback } from 'react';

let _addToast = null;

export function toast(message, type = 'success') {
  if (_addToast) _addToast({ message, type, id: Date.now() });
}

/**
 * Global Toast container — renders at the root level.
 * Use the exported `toast()` function to trigger toasts from anywhere.
 */
export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  _addToast = useCallback((t) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3200);
  }, []);

  return (
    <div id="toast-root" style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <i className={`fa-solid ${t.type === 'error' ? 'fa-circle-exclamation' : 'fa-check-circle'}`} />
          &nbsp;{t.message}
        </div>
      ))}
    </div>
  );
}
