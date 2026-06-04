import { CalendarDays, Check, Clock, X } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Portal, useBodyScrollLock } from './Portal';

type PickerButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
  title: string;
  placeholder?: string;
  hasError?: boolean;
};

const quickTimes = ['08:00', '09:00', '10:00', '14:00', '15:00', '18:00', '19:00', '20:00'];
const minuteOptions = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function todayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateParts(value: string) {
  const [year, month, day] = (value || todayDate()).split('-').map(Number);
  return {
    year: String(year || new Date().getFullYear()),
    month: String(month || new Date().getMonth() + 1),
    day: String(day || new Date().getDate()),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function createDateValue(yearText: string, monthText: string, dayText: string) {
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return '';
  }

  const safeYear = Math.min(2100, Math.max(1900, year));
  const safeMonth = Math.min(12, Math.max(1, month));
  const safeDay = Math.min(daysInMonth(safeYear, safeMonth), Math.max(1, day));
  return `${safeYear}-${pad(safeMonth)}-${pad(safeDay)}`;
}

function formatDateLabel(value: string) {
  if (!value) {
    return '';
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return value;
  }

  return `${year}年${month}月${day}日`;
}

function parseTimeParts(value: string) {
  const [hour, minute] = (value || '19:00').split(':');
  return {
    hour: pad(Number(hour || 19)),
    minute: minuteOptions.includes(minute) ? minute : '00',
  };
}

function fieldClassName(hasError = false) {
  return `pressable flex h-11 w-full items-center justify-between gap-3 rounded-md border bg-white px-3 text-left text-sm text-ink outline-none focus:ring-2 ${
    hasError ? 'border-coral focus:border-coral focus:ring-coral/15' : 'border-line focus:border-mint focus:ring-mint/15'
  }`;
}

export const AppDateInput = forwardRef<HTMLButtonElement, PickerButtonProps>(function AppDateInput(
  { value, onChange, title, placeholder = '请选择日期', hasError = false, ...props },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [parts, setParts] = useState(() => parseDateParts(value));
  const previewValue = useMemo(() => createDateValue(parts.year, parts.month, parts.day), [parts]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setParts(parseDateParts(value));
    }
  }, [isOpen, value]);

  function chooseQuick(nextValue: string) {
    setParts(parseDateParts(nextValue));
  }

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

  function confirmDate() {
    if (!previewValue) {
      return;
    }

    onChange(previewValue);
    closeSheet();
  }

  return (
    <>
      <button ref={ref} type="button" onClick={openSheet} className={fieldClassName(hasError)} {...props}>
        <span className={value ? 'text-ink' : 'text-slate-400'}>{value ? formatDateLabel(value) : placeholder}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>

      {isOpen ? (
        <Portal>
          <div
            className={`fixed inset-0 z-[70] flex items-end justify-center bg-neutral-950/25 px-3 pb-3 backdrop-blur-[2px] ${
              isClosing ? 'dialog-backdrop-out' : 'dialog-backdrop'
            }`}
          >
            <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={closeSheet} aria-label="关闭日期选择器" />
            <section className={`relative w-full max-w-[430px] rounded-3xl border border-neutral-200 bg-white p-4 shadow-2xl ${isClosing ? 'sheet-panel-out' : 'sheet-panel'}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
                  <p className="mt-1 text-xs text-neutral-500">当前：{previewValue ? formatDateLabel(previewValue) : '未选择'}</p>
                </div>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="pressable inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ['今天', todayDate()],
                  ['明天', addDays(1)],
                  ['后天', addDays(2)],
                ].map(([label, nextValue]) => (
                  <button
                    key={nextValue}
                    type="button"
                    onClick={() => chooseQuick(nextValue)}
                    className={`h-10 rounded-2xl border px-2 text-sm font-medium ${
                      previewValue === nextValue ? 'border-neutral-300 bg-neutral-100 text-neutral-950' : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-[1.2fr_1fr_1fr] gap-3">
                <label className="text-xs font-medium text-neutral-500">
                  年
                  <input
                    className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-neutral-400"
                    type="number"
                    min="1900"
                    max="2100"
                    value={parts.year}
                    onChange={(event) => setParts((current) => ({ ...current, year: event.target.value }))}
                  />
                </label>
                <label className="text-xs font-medium text-neutral-500">
                  月
                  <input
                    className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-neutral-400"
                    type="number"
                    min="1"
                    max="12"
                    value={parts.month}
                    onChange={(event) => setParts((current) => ({ ...current, month: event.target.value }))}
                  />
                </label>
                <label className="text-xs font-medium text-neutral-500">
                  日
                  <input
                    className="mt-1 h-11 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-neutral-400"
                    type="number"
                    min="1"
                    max="31"
                    value={parts.day}
                    onChange={(event) => setParts((current) => ({ ...current, day: event.target.value }))}
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeSheet}
                  className="pressable h-11 rounded-2xl border border-neutral-200 bg-white text-sm font-medium text-neutral-700 active:bg-neutral-100"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDate}
                  className="pressable h-11 rounded-2xl border border-neutral-800 bg-neutral-800 text-sm font-medium text-white active:bg-neutral-700"
                >
                  确认
                </button>
              </div>
            </section>
          </div>
        </Portal>
      ) : null}
    </>
  );
});

export const AppTimeInput = forwardRef<HTMLButtonElement, PickerButtonProps>(function AppTimeInput(
  { value, onChange, title, placeholder = '请选择时间', hasError = false, ...props },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [draft, setDraft] = useState(() => parseTimeParts(value));
  const draftValue = `${draft.hour}:${draft.minute}`;

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setDraft(parseTimeParts(value));
    }
  }, [isOpen, value]);

  function chooseTime(nextValue: string) {
    setDraft(parseTimeParts(nextValue));
  }

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

  function confirmTime() {
    onChange(draftValue);
    closeSheet();
  }

  return (
    <>
      <button ref={ref} type="button" onClick={openSheet} className={fieldClassName(hasError)} {...props}>
        <span className={value ? 'text-ink' : 'text-slate-400'}>{value || placeholder}</span>
        <Clock className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>

      {isOpen ? (
        <Portal>
          <div
            className={`fixed inset-0 z-[70] flex items-end justify-center bg-neutral-950/25 px-3 pb-3 backdrop-blur-[2px] ${
              isClosing ? 'dialog-backdrop-out' : 'dialog-backdrop'
            }`}
          >
            <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={closeSheet} aria-label="关闭时间选择器" />
            <section className={`relative w-full max-w-[430px] rounded-3xl border border-neutral-200 bg-white p-4 shadow-2xl ${isClosing ? 'sheet-panel-out' : 'sheet-panel'}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
                  <p className="mt-1 text-xs text-neutral-500">当前：{draftValue}</p>
                </div>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="pressable inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs font-medium text-neutral-500">快捷时间</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {quickTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => chooseTime(time)}
                    className={`h-10 rounded-2xl border px-2 text-sm font-medium ${
                      draftValue === time ? 'border-neutral-300 bg-neutral-100 text-neutral-950' : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-[1fr_0.9fr] gap-3">
                <div>
                  <p className="text-xs font-medium text-neutral-500">小时</p>
                  <div className="mt-2 grid max-h-36 grid-cols-4 gap-2 overflow-y-auto pr-1">
                    {Array.from({ length: 24 }, (_, hour) => pad(hour)).map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, hour }))}
                        className={`h-9 rounded-xl border text-sm font-medium ${
                          draft.hour === hour ? 'border-neutral-300 bg-neutral-100 text-neutral-950' : 'border-neutral-200 bg-white text-neutral-600'
                        }`}
                      >
                        {hour}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">分钟</p>
                  <div className="mt-2 grid max-h-36 grid-cols-3 gap-2 overflow-y-auto pr-1">
                    {minuteOptions.map((minute) => (
                      <button
                        key={minute}
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, minute }))}
                        className={`h-9 rounded-xl border text-sm font-medium ${
                          draft.minute === minute ? 'border-neutral-300 bg-neutral-100 text-neutral-950' : 'border-neutral-200 bg-white text-neutral-600'
                        }`}
                      >
                        {minute}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeSheet}
                  className="pressable h-11 rounded-2xl border border-neutral-200 bg-white text-sm font-medium text-neutral-700 active:bg-neutral-100"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmTime}
                  className="pressable h-11 rounded-2xl border border-neutral-800 bg-neutral-800 text-sm font-medium text-white active:bg-neutral-700"
                >
                  确认
                </button>
              </div>
            </section>
          </div>
        </Portal>
      ) : null}
    </>
  );
});
