import React, { useState, useEffect } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  icon?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 150);
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 bg-[#283044] text-[#eef0ff] rounded-xl shadow-2xl border border-white/10 ${
        isExiting ? 'drishti-toast-exit' : 'drishti-toast-enter'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="material-symbols-outlined text-primary-fixed text-xl shrink-0">
          {toast.icon || 'check_circle'}
        </span>
        <span className="text-xs font-medium leading-snug break-words">
          {toast.message}
        </span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-white/60 hover:text-white p-1 rounded-md drishti-btn"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
