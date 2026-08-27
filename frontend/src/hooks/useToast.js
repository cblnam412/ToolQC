import { useCallback, useRef } from 'react';

/**
 * Toast notification helper.
 * Returns a `toast(message, type)` function.
 * Components can also use the ToastContainer component instead.
 */
export function useToast() {
  const containerRef = useRef(null);

  const toast = useCallback((message, type = 'success') => {
    const container = containerRef.current || document.getElementById('toast-root');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = message;
    container.appendChild(el);

    // Animate in
    requestAnimationFrame(() => el.classList.add('toast-visible'));

    setTimeout(() => {
      el.classList.remove('toast-visible');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }, []);

  return { toast, containerRef };
}

/** Generate a short unique ID (matches backend algorithm) */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
