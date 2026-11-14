import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function NotificationToast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 99999,
      background: 'var(--bg-surface)',
      border: `1.5px solid ${isSuccess ? 'var(--c-emerald)' : isError ? 'var(--c-rose)' : 'var(--c-primary)'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      maxWidth: '420px',
      animation: 'popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{
        color: isSuccess ? 'var(--c-emerald)' : isError ? 'var(--c-rose)' : 'var(--c-primary)',
        display: 'flex',
        alignItems: 'center'
      }}>
        {isSuccess ? <CheckCircle2 size={22} /> : isError ? <AlertCircle size={22} /> : <Info size={22} />}
      </div>

      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', flex: 1 }}>
        {toast.message}
      </div>

      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
