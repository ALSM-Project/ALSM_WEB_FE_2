import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  title?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
}

// ─── Observable Event Bus for Zero-dependency Global Toasting ─────────
type ToastListener = (toasts: ToastItem[]) => void;
let toastsState: ToastItem[] = [];
const listeners = new Set<ToastListener>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...toastsState]));
};

export const toast = {
  show: (type: ToastType, message: string, options?: ToastOptions): string => {
    const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = options?.duration ?? (type === 'error' ? 5000 : 4000);
    const newItem: ToastItem = {
      id,
      type,
      title: options?.title,
      message,
      duration,
    };

    // Remove old toast with same ID if exists, then add
    toastsState = toastsState.filter((t) => t.id !== id).concat(newItem);
    notifyListeners();

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }

    return id;
  },

  success: (message: string, options?: ToastOptions) => toast.show('success', message, options),
  error: (message: string, options?: ToastOptions) => toast.show('error', message, options),
  warning: (message: string, options?: ToastOptions) => toast.show('warning', message, options),
  info: (message: string, options?: ToastOptions) => toast.show('info', message, options),

  dismiss: (id?: string) => {
    if (id) {
      toastsState = toastsState.filter((t) => t.id !== id);
    } else {
      toastsState = [];
    }
    notifyListeners();
  },
};

// ─── UI Toaster Component ─────────────────────────────────────────────
export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleChange = (items: ToastItem[]) => {
      setToasts(items);
    };
    listeners.add(handleChange);
    setToasts([...toastsState]);

    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-5 right-5 z-[99999999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none p-3"
    >
      {toasts.map((item) => {
        const isSuccess = item.type === 'success';
        const isError = item.type === 'error';
        const isWarning = item.type === 'warning';

        const borderClass = isSuccess
          ? 'border-emerald-200/80 bg-white shadow-emerald-500/10'
          : isError
            ? 'border-rose-200/80 bg-white shadow-rose-500/10'
            : isWarning
              ? 'border-amber-200/80 bg-white shadow-amber-500/10'
              : 'border-blue-200/80 bg-white shadow-blue-500/10';

        const iconBg = isSuccess
          ? 'bg-emerald-100 text-emerald-700'
          : isError
            ? 'bg-rose-100 text-rose-700'
            : isWarning
              ? 'bg-amber-100 text-amber-700'
              : 'bg-blue-100 text-blue-700';

        return (
          <div
            key={item.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl border shadow-xl transition-all duration-200 animate-in slide-in-from-top-4 fade-in ${borderClass}`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>
              {isSuccess && <CheckCircle2 className="w-5 h-5" />}
              {isError && <AlertCircle className="w-5 h-5" />}
              {isWarning && <AlertTriangle className="w-5 h-5" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              {item.title && (
                <h4 className="text-sm font-bold text-slate-900 leading-snug tracking-tight mb-0.5">
                  {item.title}
                </h4>
              )}
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                {item.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toast.dismiss(item.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0 -mr-1 -mt-1"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};
