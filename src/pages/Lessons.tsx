import { ChevronDown, ChevronUp, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { useLessons, type LessonInput } from '../store/useLessons';
import { useStudents } from '../store/useStudents';
import type { BillingType, Lesson, LessonStatus, Student, TrialFeeMode } from '../types';
import { formatMoney } from '../utils/dashboardStats';
import { showToast } from '../utils/toast';

type DurationMode = 'preset' | 'custom';

type LessonFormState = {
  studentId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationMode: DurationMode;
  durationHours: string;
  durationMinutes: string;
  rate: string;
  billingType: BillingType;
  amount: string;
  status: LessonStatus;
  trialFeeMode: TrialFeeMode;
  isSettled: boolean;
  content: string;
  homework: string;
  note: string;
};

type LessonFormErrors = Partial<Record<'studentId' | 'date' | 'duration' | 'rate' | 'billingType' | 'status' | 'amount', string>>;

const durationOptions = [1, 1.5, 2, 2.5];

const statusLabel: Record<LessonStatus, string> = {
  completed: '已上课',
  cancelled: '取消',
  leave: '请假',
  makeup: '补课',
  trial: '试课',
};

const billingTypeLabel: Record<BillingType, string> = {
  hourly: '按小时',
  per_session: '按次',
};

const trialFeeModeLabel: Record<TrialFeeMode, string> = {
  free: '免费',
  half: '半价',
  normal: '正常',
  custom: '自定义',
};

interface LessonsProps {
  onNavigateToStudents: () => void;
  openCreateRequest?: boolean;
  onCreateRequestConsumed?: () => void;
  openEditLessonId?: string | null;
  onEditRequestConsumed?: () => void;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function durationToParts(duration: number) {
  const totalMinutes = Math.max(0, Math.round(duration * 60));
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

function durationFromParts(hours: string, minutes: string) {
  const parsedHours = Number(hours || 0);
  const parsedMinutes = Number(minutes || 0);

  if (
    Number.isNaN(parsedHours) ||
    Number.isNaN(parsedMinutes) ||
    !Number.isInteger(parsedHours) ||
    !Number.isInteger(parsedMinutes) ||
    parsedHours < 0 ||
    parsedMinutes < 0 ||
    parsedMinutes >= 60
  ) {
    return '';
  }

  const duration = parsedHours + parsedMinutes / 60;
  return duration > 0 ? String(duration) : '';
}

function isPresetDuration(duration: number) {
  return durationOptions.some((option) => Math.abs(option - duration) < 0.01);
}

function formatDuration(duration: number) {
  if (Number.isNaN(duration) || duration <= 0) {
    return '0分钟';
  }

  const { hours, minutes } = durationToParts(duration);
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}小时`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}分钟`);
  }

  return parts.join('') || '0分钟';
}

function addDurationToTime(startTime: string, duration: number) {
  if (!startTime || duration <= 0 || Number.isNaN(duration)) {
    return '';
  }

  const [hour, minute] = startTime.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return '';
  }

  const totalMinutes = (hour * 60 + minute + Math.round(duration * 60)) % (24 * 60);
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;
  return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}

function calculateNormalAmount({
  duration,
  rate,
  billingType,
}: {
  duration: number;
  rate: number;
  billingType: BillingType;
}) {
  if (Number.isNaN(duration) || Number.isNaN(rate) || duration <= 0 || rate < 0) {
    return 0;
  }

  return Math.round(billingType === 'hourly' ? duration * rate : rate);
}

function calculateAutoAmount(
  form: Pick<LessonFormState, 'duration' | 'rate' | 'billingType' | 'status' | 'trialFeeMode' | 'amount'>,
) {
  const duration = Number(form.duration);
  const rate = Number(form.rate);
  const normalAmount = calculateNormalAmount({ duration, rate, billingType: form.billingType });

  if (form.status === 'cancelled' || form.status === 'leave') {
    return '0';
  }

  if (form.status === 'trial') {
    if (form.trialFeeMode === 'free') {
      return '0';
    }

    if (form.trialFeeMode === 'half') {
      return String(Math.round(normalAmount * 0.5));
    }

    if (form.trialFeeMode === 'custom') {
      return form.amount;
    }
  }

  return String(normalAmount);
}

function withAutoEndTime(form: LessonFormState) {
  const duration = Number(form.duration);
  return {
    ...form,
    endTime: form.startTime ? addDurationToTime(form.startTime, duration) : '',
  };
}

function withAutoAmount(form: LessonFormState) {
  return {
    ...form,
    amount: calculateAutoAmount(form),
  };
}

function withQuickComputed(form: LessonFormState) {
  return withAutoAmount(withAutoEndTime(form));
}

function inferTrialFeeMode(lesson: Lesson): TrialFeeMode {
  if (lesson.trialFeeMode) {
    return lesson.trialFeeMode;
  }

  if (lesson.status !== 'trial') {
    return 'half';
  }

  const normalAmount = calculateNormalAmount({
    duration: lesson.duration,
    rate: lesson.rate,
    billingType: lesson.billingType,
  });

  if (lesson.amount === 0) {
    return 'free';
  }

  if (Math.abs(lesson.amount - Math.round(normalAmount * 0.5)) <= 1) {
    return 'half';
  }

  if (Math.abs(lesson.amount - normalAmount) <= 1) {
    return 'normal';
  }

  return 'custom';
}

function emptyForm(students: Student[]): LessonFormState {
  const firstStudent = students[0];
  const duration = firstStudent?.defaultDuration ?? 2;
  const durationParts = durationToParts(duration);
  const rate = firstStudent?.defaultRate ?? 150;
  const billingType = firstStudent?.billingType ?? 'hourly';
  const status: LessonStatus = 'completed';

  return {
    studentId: firstStudent?.id ?? '',
    date: todayString(),
    startTime: '',
    endTime: '',
    duration: String(duration),
    durationMode: isPresetDuration(duration) ? 'preset' : 'custom',
    durationHours: String(durationParts.hours),
    durationMinutes: String(durationParts.minutes),
    rate: String(rate),
    billingType,
    amount: String(calculateAutoAmount({ duration: String(duration), rate: String(rate), billingType, status, trialFeeMode: 'half', amount: '0' })),
    status,
    trialFeeMode: 'half',
    isSettled: false,
    content: '',
    homework: '',
    note: '',
  };
}

function lessonToForm(lesson: Lesson): LessonFormState {
  const durationParts = durationToParts(lesson.duration);
  const trialFeeMode = inferTrialFeeMode(lesson);

  return {
    studentId: lesson.studentId,
    date: lesson.date,
    startTime: lesson.startTime ?? '',
    endTime: lesson.endTime ?? '',
    duration: String(lesson.duration),
    durationMode: isPresetDuration(lesson.duration) ? 'preset' : 'custom',
    durationHours: String(durationParts.hours),
    durationMinutes: String(durationParts.minutes),
    rate: String(lesson.rate),
    billingType: lesson.billingType,
    amount: String(lesson.amount),
    status: lesson.status,
    trialFeeMode,
    isSettled: lesson.isSettled,
    content: lesson.content ?? '',
    homework: lesson.homework ?? '',
    note: lesson.note ?? '',
  };
}

function toLessonInput(form: LessonFormState): LessonInput {
  return {
    studentId: form.studentId,
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    duration: Number(form.duration),
    rate: Number(form.rate),
    billingType: form.billingType,
    amount: Number(form.amount),
    status: form.status,
    trialFeeMode: form.status === 'trial' ? form.trialFeeMode : undefined,
    isSettled: form.isSettled,
    content: form.content,
    homework: form.homework,
    note: form.note,
  };
}

function shouldOpenMoreSettings(lesson: Lesson | null) {
  if (!lesson) {
    return false;
  }

  return Boolean(
    lesson.content ||
      lesson.homework ||
      lesson.note ||
      lesson.status !== 'completed' ||
      lesson.isSettled ||
      lesson.billingType === 'per_session',
  );
}

function summary(value?: string, empty = '暂无') {
  if (!value) {
    return empty;
  }

  return value.length > 28 ? `${value.slice(0, 28)}...` : value;
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {children}
      {required ? <span className="ml-1 text-coral">*</span> : null}
    </label>
  );
}

function fieldClassName(hasError = false) {
  return `h-11 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition focus:ring-2 ${
    hasError
      ? 'border-coral focus:border-coral focus:ring-coral/15'
      : 'border-line focus:border-mint focus:ring-mint/15'
  }`;
}

function textareaClassName() {
  return 'min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15';
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-coral">{message}</p> : null;
}

function amountPreviewText(form: LessonFormState) {
  const durationText = formatDuration(Number(form.duration));
  const normalAmount = calculateNormalAmount({
    duration: Number(form.duration),
    rate: Number(form.rate),
    billingType: form.billingType,
  });

  if (form.status === 'leave' || form.status === 'cancelled') {
    return `本节不计费，费用 ${formatMoney(0)}`;
  }

  if (form.status === 'trial') {
    if (form.trialFeeMode === 'free') {
      return `试课免费，本节费用 ${formatMoney(0)}`;
    }

    if (form.trialFeeMode === 'half') {
      return `试课半价，原价 ${formatMoney(normalAmount)}，本节 ${formatMoney(Number(form.amount || 0))}`;
    }

    if (form.trialFeeMode === 'normal') {
      return `试课按正常计费，本节 ${formatMoney(Number(form.amount || 0))}`;
    }

    return `试课自定义费用，本节 ${formatMoney(Number(form.amount || 0))}`;
  }

  if (form.billingType === 'hourly') {
    return `${durationText} × ${formatMoney(Number(form.rate || 0))}/小时 = ${formatMoney(Number(form.amount || 0))}`;
  }

  return `每次 ${formatMoney(Number(form.rate || 0))} = ${formatMoney(Number(form.amount || 0))}`;
}

function statusBadgeClass(status: LessonStatus) {
  const base = 'inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold';
  const styles: Record<LessonStatus, string> = {
    completed: 'border-mint/30 bg-mint/10 text-mint',
    makeup: 'border-sky-200 bg-sky-50 text-sky-700',
    trial: 'border-violet-200 bg-violet-50 text-violet-700',
    leave: 'border-slate-200 bg-slate-100 text-slate-600',
    cancelled: 'border-coral/25 bg-coral/10 text-coral',
  };

  return `${base} ${styles[status]}`;
}

function settlementBadgeClass(isSettled: boolean) {
  const base = 'inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold';
  return isSettled
    ? `${base} border-mint/25 bg-mint/10 text-mint`
    : `${base} border-coral/30 bg-coral/10 text-coral`;
}

interface LessonFormProps {
  initialValue: LessonFormState;
  students: Student[];
  title: string;
  defaultMoreOpen: boolean;
  isEditing: boolean;
  onCancel: () => void;
  onSave: (input: LessonInput) => void;
}

function LessonForm({ initialValue, students, title, defaultMoreOpen, isEditing, onCancel, onSave }: LessonFormProps) {
  const [form, setForm] = useState<LessonFormState>(() => (isEditing ? initialValue : withQuickComputed(initialValue)));
  const [errors, setErrors] = useState<LessonFormErrors>({});
  const [isMoreOpen, setIsMoreOpen] = useState(defaultMoreOpen);
  const fieldRefs = useRef<
    Partial<Record<keyof LessonFormErrors, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>
  >({});
  const durationHoursRef = useRef<HTMLInputElement>(null);
  const selectedStudent = students.find((student) => student.id === form.studentId);
  const isCustomDuration = form.durationMode === 'custom';

  function setFieldRef(key: keyof LessonFormErrors) {
    return (element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
      fieldRefs.current[key] = element;
    };
  }

  function clearErrors(...keys: (keyof LessonFormErrors)[]) {
    setErrors((current) => {
      const next = { ...current };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  }

  function focusField(key: keyof LessonFormErrors) {
    window.setTimeout(() => {
      const field = key === 'duration' ? durationHoursRef.current ?? fieldRefs.current.duration : fieldRefs.current[key];
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field?.focus({ preventScroll: true });
    }, 0);
  }

  function updateQuickFields(partial: Partial<LessonFormState>) {
    const errorKeys = Object.keys(partial).flatMap((key) => {
      if (key === 'duration' || key === 'durationHours' || key === 'durationMinutes') {
        return ['duration'];
      }

      if (key === 'studentId' || key === 'date' || key === 'rate' || key === 'billingType' || key === 'status' || key === 'amount') {
        return [key];
      }

      return [];
    }) as (keyof LessonFormErrors)[];

    clearErrors(...errorKeys);
    setForm((current) => withQuickComputed({ ...current, ...partial }));
  }

  function updateDuration(duration: number, mode: DurationMode) {
    const parts = durationToParts(duration);
    updateQuickFields({
      duration: String(duration),
      durationMode: mode,
      durationHours: String(parts.hours),
      durationMinutes: String(parts.minutes),
    });
  }

  function showCustomDuration() {
    const parts = durationToParts(Number(form.duration));
    updateQuickFields({
      durationMode: 'custom',
      durationHours: String(parts.hours),
      durationMinutes: String(parts.minutes),
    });
    window.setTimeout(() => durationHoursRef.current?.focus(), 0);
  }

  function updateCustomDuration(partial: Partial<Pick<LessonFormState, 'durationHours' | 'durationMinutes'>>) {
    const nextHours = partial.durationHours ?? form.durationHours;
    const nextMinutes = partial.durationMinutes ?? form.durationMinutes;

    updateQuickFields({
      ...partial,
      durationMode: 'custom',
      duration: durationFromParts(nextHours, nextMinutes),
    });
  }

  function updateSettlement(isSettled: boolean) {
    setForm((current) => ({ ...current, isSettled }));
  }

  function handleStatusChange(status: LessonStatus) {
    updateQuickFields({
      status,
      trialFeeMode: status === 'trial' ? 'half' : form.trialFeeMode,
    });
  }

  function updateTrialFeeMode(trialFeeMode: TrialFeeMode) {
    updateQuickFields({ trialFeeMode });
  }

  function handleStudentChange(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    if (!student) {
      setForm((current) => ({ ...current, studentId }));
      clearErrors('studentId');
      return;
    }

    const durationParts = durationToParts(student.defaultDuration);
    updateQuickFields({
      studentId,
      duration: String(student.defaultDuration),
      durationMode: isPresetDuration(student.defaultDuration) ? 'preset' : 'custom',
      durationHours: String(durationParts.hours),
      durationMinutes: String(durationParts.minutes),
      rate: String(student.defaultRate),
      billingType: student.billingType,
    });
  }

  function validateForm() {
    const nextErrors: LessonFormErrors = {};
    const duration = Number(form.duration);
    const rate = Number(form.rate);
    const amount = Number(form.amount);
    const minutes = Number(form.durationMinutes || 0);

    if (!form.studentId) {
      nextErrors.studentId = '请选择学生';
    }

    if (!form.date) {
      nextErrors.date = '请选择日期';
    }

    if (!form.duration || duration <= 0 || Number.isNaN(duration)) {
      nextErrors.duration = '请输入上课时长';
    } else if (isCustomDuration && (Number.isNaN(minutes) || !Number.isInteger(minutes) || minutes < 0 || minutes >= 60)) {
      nextErrors.duration = '分钟需要填写 0 到 59 之间的整数';
    }

    if (!form.rate) {
      nextErrors.rate = '请输入单价';
    } else if (rate < 0 || Number.isNaN(rate)) {
      nextErrors.rate = '单价需要是数字且不能小于 0';
    }

    if (!form.billingType) {
      nextErrors.billingType = '请选择计费方式';
    }

    if (!form.status) {
      nextErrors.status = '请选择课程状态';
    }

    if (!form.amount) {
      nextErrors.amount = '请输入金额';
    } else if (amount < 0 || Number.isNaN(amount)) {
      nextErrors.amount = '金额需要是数字且不能小于 0';
    }

    return nextErrors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm();
    const firstError = Object.keys(nextErrors)[0] as keyof LessonFormErrors | undefined;

    if (firstError) {
      setErrors(nextErrors);
      if (['rate', 'billingType', 'status', 'amount'].includes(firstError)) {
        setIsMoreOpen(true);
      }
      focusField(firstError);
      return;
    }

    setErrors({});
    onSave(toLessonInput(form));
  }

  return (
    <Card className="mb-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">快速记录一节课，默认只填核心信息。</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400"
            aria-label="关闭表单"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <FieldLabel required>学生</FieldLabel>
          <select
            ref={setFieldRef('studentId')}
            data-form-autofocus="true"
            className={fieldClassName(Boolean(errors.studentId))}
            value={form.studentId}
            onChange={(event) => handleStudentChange(event.target.value)}
          >
            <option value="">请选择学生</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.studentId} />
          <p className="mt-2 text-xs text-slate-500">科目：{selectedStudent?.subject ?? '选择学生后显示'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>日期</FieldLabel>
            <input
              ref={setFieldRef('date')}
              className={fieldClassName(Boolean(errors.date))}
              type="date"
              value={form.date}
              onChange={(event) => updateQuickFields({ date: event.target.value })}
            />
            <FieldError message={errors.date} />
          </div>
          <div>
            <FieldLabel>开始时间</FieldLabel>
            <input
              className={fieldClassName()}
              type="time"
              value={form.startTime}
              onChange={(event) => updateQuickFields({ startTime: event.target.value })}
            />
          </div>
        </div>

        <div>
          <FieldLabel required>上课时长</FieldLabel>
          <div className="mb-3 grid grid-cols-5 gap-2">
            {durationOptions.map((duration) => {
              const active = form.durationMode === 'preset' && Math.abs(Number(form.duration) - duration) < 0.01;

              return (
                <button
                  key={duration}
                  type="button"
                  onClick={() => updateDuration(duration, 'preset')}
                  className={`h-9 rounded-md border px-1 text-xs font-medium ${
                    active ? 'border-mint bg-mint text-white' : 'border-line bg-white text-slate-600'
                  }`}
                >
                  {duration}小时
                </button>
              );
            })}
            <button
              type="button"
              onClick={showCustomDuration}
              className={`h-9 rounded-md border px-1 text-xs font-medium ${
                isCustomDuration ? 'border-mint bg-mint text-white' : 'border-line bg-white text-slate-600'
              }`}
            >
              自定义
            </button>
          </div>
          {isCustomDuration ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  ref={durationHoursRef}
                  className={fieldClassName(Boolean(errors.duration))}
                  type="number"
                  min="0"
                  step="1"
                  value={form.durationHours}
                  onChange={(event) => updateCustomDuration({ durationHours: event.target.value })}
                  aria-label="小时"
                  placeholder="小时"
                />
                <p className="mt-1 text-xs text-slate-500">小时</p>
              </div>
              <div>
                <input
                  ref={setFieldRef('duration')}
                  className={fieldClassName(Boolean(errors.duration))}
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  value={form.durationMinutes}
                  onChange={(event) => updateCustomDuration({ durationMinutes: event.target.value })}
                  aria-label="分钟"
                  placeholder="分钟"
                />
                <p className="mt-1 text-xs text-slate-500">分钟</p>
              </div>
            </div>
          ) : null}
          <FieldError message={errors.duration} />
          <p className="mt-2 text-xs text-slate-500">
            {form.startTime
              ? `时长 ${formatDuration(Number(form.duration))}，预计结束：${form.endTime || '待计算'}`
              : `当前时长：${formatDuration(Number(form.duration))}。不填开始时间也可以保存。`}
          </p>
        </div>

        <div>
          <FieldLabel>结算状态</FieldLabel>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => updateSettlement(false)}
              className={`h-10 rounded-md text-sm font-semibold transition ${
                !form.isSettled ? 'bg-coral text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              未结算
            </button>
            <button
              type="button"
              onClick={() => updateSettlement(true)}
              className={`h-10 rounded-md text-sm font-semibold transition ${
                form.isSettled ? 'bg-mint text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              已结算
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-mint/25 bg-mint/10 p-4">
          <p className="text-xs font-medium text-mint">费用预览</p>
          <p className="mt-2 text-lg font-bold text-ink">{amountPreviewText(form)}</p>
          <p className="mt-1 text-xs text-slate-500">
            课程状态：{statusLabel[form.status]}，{form.isSettled ? '已结算' : '未结算'}
          </p>
        </div>

        {form.status === 'trial' ? (
          <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
            <p className="text-sm font-semibold text-violet-700">试课费用</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(Object.keys(trialFeeModeLabel) as TrialFeeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateTrialFeeMode(mode)}
                  className={`h-9 rounded-md border px-1 text-xs font-medium ${
                    form.trialFeeMode === mode
                      ? 'border-violet-500 bg-violet-500 text-white'
                      : 'border-violet-100 bg-white text-violet-700'
                  }`}
                >
                  {trialFeeModeLabel[mode]}
                </button>
              ))}
            </div>
            {form.trialFeeMode === 'custom' ? (
              <div className="mt-3">
                <FieldLabel required>自定义试课费用</FieldLabel>
                <input
                  ref={setFieldRef('amount')}
                  className={fieldClassName(Boolean(errors.amount))}
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(event) => {
                    clearErrors('amount');
                    setForm((current) => ({ ...current, amount: event.target.value }));
                  }}
                />
                <FieldError message={errors.amount} />
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsMoreOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-md bg-slate-50 px-3 py-3 text-sm font-medium text-slate-600"
        >
          更多设置
          {isMoreOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isMoreOpen ? (
          <div className="space-y-4 rounded-lg border border-line bg-white p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>课程状态</FieldLabel>
                <select
                  ref={setFieldRef('status')}
                  className={fieldClassName(Boolean(errors.status))}
                  value={form.status}
                  onChange={(event) => handleStatusChange(event.target.value as LessonStatus)}
                >
                  <option value="completed">已上课</option>
                  <option value="leave">请假</option>
                  <option value="cancelled">取消</option>
                  <option value="makeup">补课</option>
                  <option value="trial">试课</option>
                </select>
                <FieldError message={errors.status} />
              </div>
              <div>
                <FieldLabel required>计费方式</FieldLabel>
                <select
                  ref={setFieldRef('billingType')}
                  className={fieldClassName(Boolean(errors.billingType))}
                  value={form.billingType}
                  onChange={(event) => updateQuickFields({ billingType: event.target.value as BillingType })}
                >
                  <option value="hourly">按小时</option>
                  <option value="per_session">按次</option>
                </select>
                <FieldError message={errors.billingType} />
              </div>
            </div>

            <div className={`grid gap-3 ${form.status === 'trial' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div>
                <FieldLabel>单价</FieldLabel>
                <input
                  ref={setFieldRef('rate')}
                  className={fieldClassName(Boolean(errors.rate))}
                  type="number"
                  min="0"
                  step="1"
                  value={form.rate}
                  onChange={(event) => updateQuickFields({ rate: event.target.value })}
                />
                <FieldError message={errors.rate} />
              </div>
              {form.status !== 'trial' ? (
                <div>
                  <FieldLabel required>金额</FieldLabel>
                  <input
                    ref={setFieldRef('amount')}
                    className={fieldClassName(Boolean(errors.amount))}
                    type="number"
                    min="0"
                    step="1"
                    value={form.amount}
                    onChange={(event) => {
                      clearErrors('amount');
                      setForm((current) => ({ ...current, amount: event.target.value }));
                    }}
                  />
                  <FieldError message={errors.amount} />
                </div>
              ) : null}
            </div>

            <div>
              <FieldLabel>课堂内容</FieldLabel>
              <textarea
                className={textareaClassName()}
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="本节课讲了哪些内容"
              />
            </div>

            <div>
              <FieldLabel>作业</FieldLabel>
              <textarea
                className={textareaClassName()}
                value={form.homework}
                onChange={(event) => setForm((current) => ({ ...current, homework: event.target.value }))}
                placeholder="布置的练习或复习任务"
              />
            </div>

            <div>
              <FieldLabel>备注</FieldLabel>
              <textarea
                className={textareaClassName()}
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="特殊情况、沟通记录等"
              />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <ActionButton onClick={onCancel}>取消</ActionButton>
          <ActionButton variant="primary" type="submit">
            保存课时
          </ActionButton>
        </div>
      </form>
    </Card>
  );
}

function LessonCard({
  lesson,
  student,
  onEdit,
  onDelete,
}: {
  lesson: Lesson;
  student?: Student;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}) {
  const timeText = lesson.startTime && lesson.endTime ? `${lesson.startTime}-${lesson.endTime}` : '未填写时间';
  const subjectText = student?.subject ?? '未填写科目';

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {lesson.date} {timeText}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {student?.name ?? '未知学生'} · {subjectText}
          </p>
        </div>
        <p className="text-xl font-bold text-coral">{formatMoney(lesson.amount)}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={statusBadgeClass(lesson.status)}>{statusLabel[lesson.status]}</span>
        <span className={settlementBadgeClass(lesson.isSettled)}>{lesson.isSettled ? '已结算' : '未结算'}</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">时长</dt>
          <dd className="mt-1 font-semibold">{formatDuration(lesson.duration)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">单价</dt>
          <dd className="mt-1 font-semibold">{formatMoney(lesson.rate)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">计费方式</dt>
          <dd className="mt-1 font-semibold">{billingTypeLabel[lesson.billingType]}</dd>
        </div>
        <div>
          <dt className="text-slate-500">结算状态</dt>
          <dd className="mt-1 font-semibold">{lesson.isSettled ? '已结算' : '未结算'}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        <p>课堂内容：{summary(lesson.content)}</p>
        <p>作业：{summary(lesson.homework)}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ActionButton className="inline-flex items-center justify-center gap-2" onClick={() => onEdit(lesson)}>
          <Edit2 className="h-4 w-4" />
          编辑
        </ActionButton>
        <button
          type="button"
          onClick={() => onDelete(lesson)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-slate-500"
        >
          <Trash2 className="h-4 w-4" />
          删除
        </button>
      </div>
    </Card>
  );
}

export function Lessons({
  onNavigateToStudents,
  openCreateRequest = false,
  onCreateRequestConsumed,
  openEditLessonId = null,
  onEditRequestConsumed,
}: LessonsProps) {
  const { students } = useStudents();
  const { lessons, addLesson, updateLesson, deleteLesson } = useLessons();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);

  function openCreateForm() {
    setEditingLesson(null);
    setIsFormOpen(true);
  }

  useEffect(() => {
    if (openCreateRequest) {
      openCreateForm();
      onCreateRequestConsumed?.();
    }
  }, [openCreateRequest, onCreateRequestConsumed]);

  useEffect(() => {
    if (!openEditLessonId) {
      return;
    }

    const lesson = lessons.find((item) => item.id === openEditLessonId);
    if (lesson) {
      openEditForm(lesson);
      onEditRequestConsumed?.();
    }
  }, [openEditLessonId, lessons, onEditRequestConsumed]);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const firstField = formContainerRef.current?.querySelector<HTMLElement>('[data-form-autofocus="true"]');
    firstField?.focus({ preventScroll: true });
  }, [isFormOpen, editingLesson?.id]);

  function openEditForm(lesson: Lesson) {
    setEditingLesson(lesson);
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingLesson(null);
    setIsFormOpen(false);
  }

  function handleSave(input: LessonInput) {
    if (editingLesson) {
      updateLesson(editingLesson.id, input);
      showToast('课时已更新');
    } else {
      addLesson(input);
      showToast('课时已保存');
    }

    closeForm();
  }

  function handleDelete(lesson: Lesson) {
    const student = studentMap.get(lesson.studentId);
    const confirmed = window.confirm(`确定删除 ${student?.name ?? '该学生'} 在 ${lesson.date} 的课时记录吗？`);
    if (confirmed) {
      deleteLesson(lesson.id);
      showToast('课时已删除');
    }
  }

  const canCreateLesson = students.length > 0;

  return (
    <div>
      <PageHeader title="课时记录" />

      {canCreateLesson && !isFormOpen ? (
        <ActionButton variant="primary" className="mb-4 inline-flex w-full items-center justify-center gap-2" onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          新增课时
        </ActionButton>
      ) : null}

      {isFormOpen ? (
        <div ref={formContainerRef} className="scroll-mt-4 scroll-mb-28">
          <LessonForm
            title={editingLesson ? '编辑课时' : '新增课时'}
            initialValue={editingLesson ? lessonToForm(editingLesson) : emptyForm(students)}
            students={students}
            defaultMoreOpen={shouldOpenMoreSettings(editingLesson)}
            isEditing={Boolean(editingLesson)}
            onCancel={closeForm}
            onSave={handleSave}
          />
        </div>
      ) : null}

      {students.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-500">还没有学生，先添加学生后再记录课时。</p>
          <ActionButton variant="primary" className="mt-4" onClick={onNavigateToStudents}>
            去添加学生
          </ActionButton>
        </Card>
      ) : lessons.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-500">还没有课时记录，上完第一节课后记录一下吧。</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              student={studentMap.get(lesson.studentId)}
              onEdit={openEditForm}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
