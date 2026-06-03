import { useEffect, useState } from 'react';
import { addToastListener, consumeQueuedToast, type ToastType } from '../utils/toast';

type ToastState = {
  message: string;
  type: ToastType;
};

const toneClass: Record<ToastType, string> = {
  success: 'border-neutral-900 bg-neutral-900 text-white',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-neutral-200 bg-white text-neutral-800',
};

export function ToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const queuedToast = consumeQueuedToast();
    if (queuedToast?.message) {
      setToast({ message: queuedToast.message, type: queuedToast.type ?? 'success' });
    }

    return addToastListener((nextToast) => setToast(nextToast));
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[min(390px,calc(100vw-32px))] -translate-x-1/2 px-2">
      <div className={`rounded-2xl border px-4 py-3 text-center text-sm font-medium shadow-2xl ${toneClass[toast.type]}`}>
        {toast.message}
      </div>
    </div>
  );
}
