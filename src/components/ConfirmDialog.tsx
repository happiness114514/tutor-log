import { useCallback, useState } from 'react';
import { Portal, useBodyScrollLock } from './Portal';

type ConfirmTone = 'default' | 'danger';

type ConfirmOptions = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
};

type ConfirmRequest = Required<ConfirmOptions> & {
  resolve: (confirmed: boolean) => void;
};

function ConfirmDialog({
  request,
  onResolve,
}: {
  request: ConfirmRequest | null;
  onResolve: (confirmed: boolean) => void;
}) {
  useBodyScrollLock(Boolean(request));

  if (!request) {
    return null;
  }

  const confirmClass =
    request.tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700 active:bg-rose-100'
      : 'border-neutral-800 bg-neutral-800 text-white active:bg-neutral-700';

  return (
    <Portal>
      <div className="dialog-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/25 px-4 backdrop-blur-[2px]">
        <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={() => onResolve(false)} aria-label="关闭弹窗" />
        <section className="dialog-panel relative w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl">
          <h2 className="text-lg font-semibold text-neutral-950">{request.title}</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-600">{request.description}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onResolve(false)}
              className="h-11 rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition active:bg-neutral-100"
            >
              {request.cancelText}
            </button>
            <button
              type="button"
              onClick={() => onResolve(true)}
              className={`h-11 rounded-2xl border px-3 text-sm font-medium transition ${confirmClass}`}
            >
              {request.confirmText}
            </button>
          </div>
        </section>
      </div>
    </Portal>
  );
}

export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({
        title: options.title,
        description: options.description,
        confirmText: options.confirmText ?? '确认',
        cancelText: options.cancelText ?? '取消',
        tone: options.tone ?? 'default',
        resolve,
      });
    });
  }, []);

  const handleResolve = useCallback(
    (confirmed: boolean) => {
      request?.resolve(confirmed);
      setRequest(null);
    },
    [request],
  );

  return {
    confirm,
    confirmDialog: <ConfirmDialog request={request} onResolve={handleResolve} />,
  };
}
