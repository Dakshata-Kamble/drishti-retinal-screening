import React, { useState, useEffect, useSyncExternalStore } from 'react';

// ── Subscribe to navigator.onLine ──────────────────────────────
function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}
function getSnapshot() {
  return navigator.onLine;
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, getSnapshot, () => true);
}

// ── Offline Banner ─────────────────────────────────────────────
export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);

  // Show "Back online" toast briefly when reconnecting
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
      setShowReconnect(true);
      const t = setTimeout(() => setShowReconnect(false), 3000);
      return () => clearTimeout(t);
    } else {
      setShowReconnect(false);
      setDismissed(false);
    }
  }, [isOnline]);

  if (isOnline && !showReconnect) return null;
  if (dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: isOnline ? '#065f46' : '#fff',
        background: isOnline
          ? 'linear-gradient(90deg, #d1fae5 0%, #a7f3d0 100%)'
          : 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'all 0.3s ease',
        animation: 'slideDown 0.3s ease',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 18 }}
      >
        {isOnline ? 'wifi' : 'wifi_off'}
      </span>
      <span>
        {isOnline
          ? 'Connection restored — queued records will sync automatically.'
          : 'You are offline. All changes are saved locally and will sync when reconnected.'}
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          marginLeft: 8,
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          opacity: 0.7,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};
