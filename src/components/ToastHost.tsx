import { useEffect, useState } from 'react';
import { addToastListener, consumeQueuedToast, type ToastType } from '../utils/toast';

type ToastState = {
  message: string;
  type: ToastType;
  id: number;
  leaving: boolean;
};

const toneClass: Record<ToastType, string> = {
  success: 'border-neutral-800 bg-neutral-800 text-white',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-neutral-200 bg-white text-neutral-800',
};

export function ToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const queuedToast = consumeQueuedToast();
    if (queuedToast?.message) {
      setToast({ message: queuedToast.message, type: queuedToast.type ?? 'success', id: Date.now(), leaving: false });
    }

    return addToastListener((nextToast) =>
      setToast({
        ...nextToast,
        id: Date.now(),
        leaving: false,
      }),
    );
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const leaveTimer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? { ...current, leaving: true } : current));
    }, 2400);
    const removeTimer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 2630);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, [toast?.id]);

  if (!toast) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[min(390px,calc(100vw-32px))] -translate-x-1/2 px-2">
      <div
        className={`rounded-2xl border px-4 py-3 text-center text-sm font-medium shadow-2xl ${
          toast.leaving ? 'toast-leave' : 'toast-enter'
        } ${toneClass[toast.type]}`}
      >
        {toast.message}
      </div>
    </div>
  );
}
