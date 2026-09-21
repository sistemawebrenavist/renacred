import React, { useEffect } from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const confirmBtnClasses = {
    danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
  }[variant];

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 transition disabled:opacity-50 text-sm p-1"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="text-slate-600 text-xs leading-relaxed py-1">
          {typeof description === 'string' ? (
            <p className="whitespace-pre-line">{description}</p>
          ) : (
            description
          )}
        </div>

        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 transition shadow-xs disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl font-semibold transition shadow-xs disabled:opacity-50 inline-flex items-center ${confirmBtnClasses}`}
          >
            {loading ? 'Processando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
