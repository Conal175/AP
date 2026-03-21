import { useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const ICON_STYLES = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

function ToastMessage({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  const Icon = ICONS[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm animate-in slide-in-from-right-5 ${STYLES[toast.type]}`}>
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${ICON_STYLES[toast.type]}`} />
      <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
      <button onClick={() => onClose(toast.id)} className="opacity-60 hover:opacity-100 transition-opacity shrink-0 mt-0.5">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: ToastProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      {toasts.map(t => <ToastMessage key={t.id} toast={t} onClose={onClose} />)}
    </div>
  );
}

// =========================================================
// HOOK: useToast — Dùng ở mọi nơi trong app
// =========================================================
let globalToastFn: ((type: ToastType, message: string, duration?: number) => void) | null = null;

export function registerGlobalToast(fn: typeof globalToastFn) {
  globalToastFn = fn;
}

/** Thay thế alert() / confirm thông báo thành công / lỗi */
export const toast = {
  success: (msg: string, dur?: number) => globalToastFn?.('success', msg, dur),
  error: (msg: string, dur?: number) => globalToastFn?.('error', msg, dur),
  warning: (msg: string, dur?: number) => globalToastFn?.('warning', msg, dur),
  info: (msg: string, dur?: number) => globalToastFn?.('info', msg, dur),
};

export function useToastManager() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `toast-${Date.now()}-${counterRef.current++}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Đăng ký global fn để toast.success() / toast.error() hoạt động từ bất kỳ đâu
  useEffect(() => {
    registerGlobalToast(addToast);
    return () => registerGlobalToast(null);
  }, [addToast]);

  return { toasts, removeToast };
}

// =========================================================
// HELPER: Thay thế confirm() native bằng window.confirm 
// nhưng trả về Promise (dùng khi refactor dần)
// =========================================================
export function confirmDialog(message: string): boolean {
  return window.confirm(message);
}
