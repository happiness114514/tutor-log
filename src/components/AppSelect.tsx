import { Check, ChevronDown, X } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef, useMemo, useState } from 'react';
import { Portal, useBodyScrollLock } from './Portal';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type AppSelectProps<T extends string> = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> & {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  title: string;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  disabled?: boolean;
  helperText?: string;
};

export const AppSelect = forwardRef<HTMLButtonElement, AppSelectProps<string>>(function AppSelect(
  {
    value,
    options,
    onChange,
    title,
    placeholder = '请选择',
    className = '',
    hasError = false,
    disabled = false,
    helperText,
    ...props
  },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  useBodyScrollLock(isOpen);
  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

  function openSheet() {
    setIsOpen(true);
    setIsClosing(false);
  }

  function closeSheet() {
    setIsClosing(true);
    window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 180);
  }

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    closeSheet();
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={openSheet}
        className={`pressable flex h-11 w-full items-center justify-between gap-3 rounded-md border bg-white px-3 text-left text-sm text-ink outline-none focus:ring-2 disabled:bg-neutral-100 disabled:text-neutral-400 ${
          hasError
            ? 'border-coral focus:border-coral focus:ring-coral/15'
            : 'border-line focus:border-mint focus:ring-mint/15'
        } ${className}`}
        {...props}
      >
        <span className={selectedOption ? 'text-ink' : 'text-slate-400'}>{selectedOption?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>
      {helperText ? <p className="mt-2 text-xs text-slate-500">{helperText}</p> : null}

      {isOpen ? (
        <Portal>
          <div
            className={`fixed inset-0 z-[70] flex items-end justify-center bg-neutral-950/25 px-3 pb-3 backdrop-blur-[2px] ${
              isClosing ? 'dialog-backdrop-out' : 'dialog-backdrop'
            }`}
          >
            <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={closeSheet} aria-label="关闭选择器" />
            <section className={`relative w-full max-w-[430px] rounded-3xl border border-neutral-200 bg-white p-4 shadow-2xl ${isClosing ? 'sheet-panel-out' : 'sheet-panel'}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="pressable inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[55vh] overflow-y-auto">
                {options.map((option) => {
                  const active = option.value === value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`pressable flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left ${
                        active ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-700 active:bg-neutral-50'
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-medium">{option.label}</span>
                        {option.description ? <span className="mt-1 block text-xs text-neutral-500">{option.description}</span> : null}
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0 text-neutral-900" /> : null}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={closeSheet}
                className="pressable mt-3 h-11 w-full rounded-2xl border border-neutral-200 bg-white text-sm font-medium text-neutral-700 active:bg-neutral-100"
              >
                取消
              </button>
            </section>
          </div>
        </Portal>
      ) : null}
    </>
  );
});

