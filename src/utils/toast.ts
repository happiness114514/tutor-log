export type ToastType = 'success' | 'error' | 'info';

export type ToastMessage = {
  message: string;
  type?: ToastType;
};

const TOAST_EVENT = 'tutor-log:toast';
const QUEUED_TOAST_KEY = 'tutor-log.queuedToast';

export function showToast(message: string, type: ToastType = 'success') {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail: { message, type } }));
}

export function queueToast(message: string, type: ToastType = 'success') {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(QUEUED_TOAST_KEY, JSON.stringify({ message, type }));
}

export function consumeQueuedToast() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(QUEUED_TOAST_KEY);
  if (!raw) {
    return null;
  }

  window.sessionStorage.removeItem(QUEUED_TOAST_KEY);

  try {
    return JSON.parse(raw) as ToastMessage;
  } catch {
    return null;
  }
}

export function addToastListener(listener: (toast: Required<ToastMessage>) => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  function handleToast(event: Event) {
    const detail = (event as CustomEvent<ToastMessage>).detail;
    if (detail?.message) {
      listener({ message: detail.message, type: detail.type ?? 'success' });
    }
  }

  window.addEventListener(TOAST_EVENT, handleToast);
  return () => window.removeEventListener(TOAST_EVENT, handleToast);
}
