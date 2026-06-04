import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Portal, useBodyScrollLock } from './Portal';

interface BottomSheetProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}

export function BottomSheet({ open, title, children, onClose, footer }: BottomSheetProps) {
  useBodyScrollLock(open);

  if (!open) {
    return null;
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
        <button
          type="button"
          className="absolute inset-0 bg-neutral-950/25 backdrop-blur-[2px]"
          onClick={onClose}
          aria-label="关闭抽屉"
        />
        <section className="sheet-panel absolute inset-x-0 bottom-0 mx-auto flex max-h-[90vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border border-neutral-200 bg-white shadow-[0_-18px_60px_rgba(23,23,23,0.18)]">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
            <div className="min-w-0">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-200" />
              <h2 className="truncate text-base font-semibold text-neutral-900">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition active:bg-neutral-200"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <footer className="shrink-0 border-t border-neutral-100 bg-white px-5 py-4">{footer}</footer> : null}
        </section>
      </div>
    </Portal>
  );
}
