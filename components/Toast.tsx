
import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  /** Se true, só fecha ao clicar no X */
  persistent?: boolean;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.persistent) return;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.persistent, onClose]);

  const icons = {
    success: <CheckCircle2 size={20} className="text-green-600" />,
    error: <XCircle size={20} className="text-red-600" />,
    info: <Info size={20} className="text-blue-600" />,
    warning: <AlertCircle size={20} className="text-yellow-600" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200 dark:bg-green-950/80 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-950/80 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/80 dark:border-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-amber-950/80 dark:border-amber-700',
  };

  const textColors = {
    success: 'text-green-800 dark:text-green-200',
    error: 'text-red-800 dark:text-red-200',
    info: 'text-blue-800 dark:text-blue-200',
    warning: 'text-yellow-800 dark:text-amber-200',
  };

  return (
    <div
      className={`${bgColors[toast.type]} ${textColors[toast.type]} border rounded-xl p-4 shadow-lg flex items-start gap-3 min-w-[300px] max-w-md animate-in slide-in-from-top-5 fade-in-0`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <p className="flex-1 text-sm font-medium whitespace-pre-line">{toast.message}</p>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <X size={18} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

export type ShowToastOptions = {
  persistent?: boolean;
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (
    message: string,
    type: ToastType = 'info',
    options?: ShowToastOptions
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [
      ...prev,
      { id, message, type, persistent: options?.persistent },
    ]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, showToast, removeToast };
};
