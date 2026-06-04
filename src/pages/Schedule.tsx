import { ArrowLeft, Edit2, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ActionButton } from '../components/ActionButton';
import { AppDateInput, AppTimeInput } from '../components/AppDateTimePicker';
import { AppSelect } from '../components/AppSelect';
import { Card } from '../components/Card';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { useLessons } from '../store/useLessons';
import { useSchedules, type ScheduleInput } from '../store/useSchedules';
import { useStudents } from '../store/useStudents';
import type { BillingType, Schedule as ScheduleModel, ScheduleStatus, ScheduleType, Student } from '../types';
import { formatDuration, formatMoney } from '../utils/dashboardStats';
import {
  calculateDuration,
  calculateEndTime,
  createLessonFromSchedule,
  formatMonthDay,
  formatWeekday,
  getCourseTodoDisplayStatus,
  getScheduleReminderWindow,
  getTodayDate,
  getTodayScheduleInstances,
  getWeekRange,
  getWeekScheduleInstances,
  getWeekday,
  groupScheduleInstancesByDate,
  hasGeneratedLesson,
  isWithinReminderWindow,
  type ScheduleInstance,
} from '../utils/scheduleUtils';
import { createDeletedStudentSnapshot, createStudentSnapshot, getStudentDisplay } from '../utils/studentDisplay';
import { showToast } from '../utils/toast';

type ScheduleView = 'today' | 'week' | 'recurring';

type ScheduleFormState = {
  studentId: string;
  subject: string;
  scheduleType: ScheduleType;
  weekdays: number[];
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  reminderMinutesBefore: string;
  postClassReminderEnabled: boolean;
  defaultDuration: string;
  defaultRate: string;
  billingType: BillingType;
  status: ScheduleStatus;
  note: string;
};

type ScheduleFormErrors = Partial<Record<keyof ScheduleFormState, string>>;

interface ScheduleProps {
  onCreateStudent: () => void;
  onOpenLessonEditor: (lessonId: string) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

const viewTabs: { id: ScheduleView; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: 'week', label: '本周' },
  { id: 'recurring', label: '固定课程' },
];

const weekdayOptions = [1, 2, 3, 4, 5, 6, 7];

const typeLabel: Record<ScheduleType, string> = {
  recurring: '固定课程',
  one_time: '临时课程',
};

const statusLabel: Record<ScheduleStatus, string> = {
  active: '启用',
  paused: '暂停',
  ended: '已结束',
};

const billingTypeOptions = [
  { value: 'hourly', label: '按小时' },
  { value: 'per_session', label: '按次' },
];

const reminderOptions = [
  { value: '', label: '不提醒' },
  { value: '0', label: '准时' },
  { value: '10', label: '提前10分钟' },
  { value: '30', label: '提前30分钟' },
  { value: '60', label: '提前60分钟' },
];

const instanceStatusLabel: Record<ScheduleInstance['status'], string> = {
  later_today: '待上课',
  countdown: '即将上课',
  in_progress: '正在上课',
  ended_pending_record: '待记录',
  recorded: '已记录',
};

function fieldClassName(hasError = false) {
  return `h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-mint ${
    hasError ? 'border-coral' : 'border-line'
  }`;
}

function textareaClassName() {
  return 'min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-mint';
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {children}
      {required ? <span className="ml-1 text-coral">*</span> : null}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-coral">{message}</p> : null;
}

function getStudentDefaults(students: Student[]) {
  const firstStudent = students[0];
  const duration = firstStudent?.defaultDuration ?? 2;

  return {
    studentId: firstStudent?.id ?? '',
    subject: firstStudent?.subject ?? '',
    defaultDuration: String(duration),
    defaultRate: String(firstStudent?.defaultRate ?? 150),
    billingType: firstStudent?.billingType ?? 'hourly',
    endTime: calculateEndTime('19:00', duration),
  };
}

function createEmptyForm(students: Student[], scheduleType: ScheduleType): ScheduleFormState {
  const defaults = getStudentDefaults(students);

  return {
    studentId: defaults.studentId,
    subject: defaults.subject,
    scheduleType,
    weekdays: scheduleType === 'recurring' ? [getWeekday(new Date())] : [],
    date: getTodayDate(),
    startTime: '19:00',
    endTime: defaults.endTime,
    location: '',
    reminderMinutesBefore: scheduleType === 'recurring' ? '30' : '',
    postClassReminderEnabled: true,
    defaultDuration: defaults.defaultDuration,
    defaultRate: defaults.defaultRate,
    billingType: defaults.billingType,
    status: 'active',
    note: '',
  };
}

function scheduleToForm(schedule: ScheduleModel): ScheduleFormState {
  return {
    studentId: schedule.studentId,
    subject: schedule.subject ?? '',
    scheduleType: schedule.scheduleType,
    weekdays: schedule.repeatRule?.weekdays ?? [],
    date: schedule.date ?? getTodayDate(),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    location: schedule.location ?? '',
    reminderMinutesBefore:
      schedule.reminderMinutesBefore === undefined ? '' : String(schedule.reminderMinutesBefore),
    postClassReminderEnabled: schedule.postClassReminderEnabled,
    defaultDuration: String(schedule.defaultDuration),
    defaultRate: String(schedule.defaultRate),
    billingType: schedule.billingType,
    status: schedule.status,
    note: schedule.note ?? '',
  };
}

function toScheduleInput(form: ScheduleFormState, students: Student[]): ScheduleInput {
  const selectedStudent = students.find((student) => student.id === form.studentId);
  const snapshot = selectedStudent ? createStudentSnapshot(selectedStudent) : createDeletedStudentSnapshot();

  return {
    studentId: form.studentId,
    ...snapshot,
    subject: form.subject,
    scheduleType: form.scheduleType,
    repeatRule:
      form.scheduleType === 'recurring'
        ? {
            frequency: 'weekly',
            weekdays: form.weekdays,
          }
        : undefined,
    date: form.scheduleType === 'one_time' ? form.date : undefined,
    startTime: form.startTime,
    endTime: form.endTime,
    location: form.location,
    reminderMinutesBefore: form.reminderMinutesBefore === '' ? undefined : Number(form.reminderMinutesBefore),
    postClassReminderEnabled: form.postClassReminderEnabled,
    defaultDuration: Number(form.defaultDuration),
    defaultRate: Number(form.defaultRate),
    billingType: form.billingType,
    status: form.status,
    note: form.note,
  };
}

function summarizeWeekdays(weekdays: number[]) {
  return weekdays.length ? weekdays.map(formatWeekday).join('、') : '未设置';
}

function statusClassName(status: ScheduleInstance['status']) {
  if (status === 'recorded') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === 'ended_pending_record') {
    return 'bg-amber-50 text-amber-800';
  }

  if (status === 'in_progress') {
    return 'bg-neutral-900 text-white';
  }

  if (status === 'countdown') {
    return 'bg-stone-100 text-stone-800';
  }

  return 'bg-neutral-100 text-neutral-600';
}

function ScheduleForm({
  students,
  initialValue,
  onCancel,
  onSave,
}: {
  students: Student[];
  initialValue: ScheduleFormState;
  onCancel: () => void;
  onSave: (input: ScheduleInput) => void;
}) {
  const [form, setForm] = useState(initialValue);
  const [errors, setErrors] = useState<ScheduleFormErrors>({});
  const fieldRefs = useRef<Partial<Record<keyof ScheduleFormState, HTMLElement | null>>>({});

  function setFieldRef(key: keyof ScheduleFormState) {
    return (element: HTMLElement | null) => {
      fieldRefs.current[key] = element;
    };
  }

  function focusField(key: keyof ScheduleFormState) {
    fieldRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fieldRefs.current[key]?.focus({ preventScroll: true });
  }

  function clearError(key: keyof ScheduleFormState) {
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updateForm(partial: Partial<ScheduleFormState>) {
    setForm((current) => ({ ...current, ...partial }));
    (Object.keys(partial) as (keyof ScheduleFormState)[]).forEach(clearError);
  }

  function handleStudentChange(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    if (!student) {
      updateForm({ studentId });
      return;
    }

    updateForm({
      studentId,
      subject: student.subject ?? '',
      defaultDuration: String(student.defaultDuration),
      defaultRate: String(student.defaultRate),
      billingType: student.billingType,
      endTime: form.startTime ? calculateEndTime(form.startTime, student.defaultDuration) : form.endTime,
    });
  }

  function updateStartTime(startTime: string) {
    updateForm({
      startTime,
      endTime: calculateEndTime(startTime, Number(form.defaultDuration)) || form.endTime,
    });
  }

  function updateDuration(defaultDuration: string) {
    updateForm({
      defaultDuration,
      endTime: calculateEndTime(form.startTime, Number(defaultDuration)) || form.endTime,
    });
  }

  function updateEndTime(endTime: string) {
    const duration = calculateDuration(form.startTime, endTime);
    updateForm({
      endTime,
      defaultDuration: duration > 0 ? String(duration) : form.defaultDuration,
    });
  }

  function toggleWeekday(weekday: number) {
    const hasWeekday = form.weekdays.includes(weekday);
    const weekdays = hasWeekday ? form.weekdays.filter((item) => item !== weekday) : [...form.weekdays, weekday];
    updateForm({ weekdays: weekdays.sort((a, b) => a - b) });
  }

  function validateForm() {
    const nextErrors: ScheduleFormErrors = {};
    const duration = Number(form.defaultDuration);
    const rate = Number(form.defaultRate);

    if (!form.studentId) {
      nextErrors.studentId = '请选择学生';
    }

    if (form.scheduleType === 'recurring' && form.weekdays.length === 0) {
      nextErrors.weekdays = '请选择每周几上课';
    }

    if (form.scheduleType === 'one_time' && !form.date) {
      nextErrors.date = '请选择课程日期';
    }

    if (!form.startTime) {
      nextErrors.startTime = '请选择开始时间';
    }

    if (!form.endTime) {
      nextErrors.endTime = '请选择结束时间';
    } else if (form.startTime && calculateDuration(form.startTime, form.endTime) <= 0) {
      nextErrors.endTime = '结束时间需要晚于开始时间';
    }

    if (!form.defaultDuration || duration <= 0 || Number.isNaN(duration)) {
      nextErrors.defaultDuration = '请输入大于 0 的默认时长';
    }

    if (!form.defaultRate || rate <= 0 || Number.isNaN(rate)) {
      nextErrors.defaultRate = '请输入大于 0 的默认单价';
    }

    return nextErrors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm();
    const firstError = Object.keys(nextErrors)[0] as keyof ScheduleFormState | undefined;

    if (firstError) {
      setErrors(nextErrors);
      focusField(firstError);
      return;
    }

    onSave(toScheduleInput(form, students));
  }

  const isRecurring = form.scheduleType === 'recurring';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-2">
      <p className="text-xs leading-5 text-slate-500">计划课程不会计入收入，记录课时后才会结算。</p>

        <div>
          <FieldLabel required>学生</FieldLabel>
          <AppSelect
            ref={setFieldRef('studentId')}
            data-form-autofocus="true"
            title="选择学生"
            hasError={Boolean(errors.studentId)}
            value={form.studentId}
            placeholder="请选择学生"
            options={students.map((student) => ({
              value: student.id,
              label: student.name,
              description: [student.grade, student.subject].filter(Boolean).join(' · ') || '未填写年级/科目',
            }))}
            onChange={handleStudentChange}
          />
          <FieldError message={errors.studentId} />
        </div>

        <div>
          <FieldLabel>科目</FieldLabel>
          <input
            className={fieldClassName()}
            value={form.subject}
            onChange={(event) => updateForm({ subject: event.target.value })}
            placeholder="例如：数学"
          />
        </div>

        {isRecurring ? (
          <div>
            <FieldLabel required>每周几</FieldLabel>
            <div ref={setFieldRef('weekdays')} tabIndex={-1} className="grid grid-cols-7 gap-2 outline-none">
              {weekdayOptions.map((weekday) => {
                const active = form.weekdays.includes(weekday);
                return (
                  <button
                    key={weekday}
                    type="button"
                    onClick={() => toggleWeekday(weekday)}
                    className={`h-9 rounded-md border text-xs font-medium ${
                      active ? 'border-mint bg-mint text-white' : 'border-line bg-white text-slate-600'
                    }`}
                  >
                    {formatWeekday(weekday).replace('周', '')}
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.weekdays} />
          </div>
        ) : (
          <div>
            <FieldLabel required>日期</FieldLabel>
            <AppDateInput
              ref={setFieldRef('date')}
              title="选择课程日期"
              hasError={Boolean(errors.date)}
              value={form.date}
              onChange={(date) => updateForm({ date })}
            />
            <FieldError message={errors.date} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>开始时间</FieldLabel>
            <AppTimeInput
              ref={setFieldRef('startTime')}
              title="选择开始时间"
              hasError={Boolean(errors.startTime)}
              value={form.startTime}
              onChange={updateStartTime}
            />
            <FieldError message={errors.startTime} />
          </div>
          <div>
            <FieldLabel required>结束时间</FieldLabel>
            <AppTimeInput
              ref={setFieldRef('endTime')}
              title="选择结束时间"
              hasError={Boolean(errors.endTime)}
              value={form.endTime}
              onChange={updateEndTime}
            />
            <FieldError message={errors.endTime} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>默认时长</FieldLabel>
            <input
              ref={setFieldRef('defaultDuration')}
              className={fieldClassName(Boolean(errors.defaultDuration))}
              type="number"
              min="0.25"
              step="0.25"
              value={form.defaultDuration}
              onChange={(event) => updateDuration(event.target.value)}
            />
            <FieldError message={errors.defaultDuration} />
          </div>
          <div>
            <FieldLabel required>默认单价</FieldLabel>
            <input
              ref={setFieldRef('defaultRate')}
              className={fieldClassName(Boolean(errors.defaultRate))}
              type="number"
              min="0"
              step="1"
              value={form.defaultRate}
              onChange={(event) => updateForm({ defaultRate: event.target.value })}
            />
            <FieldError message={errors.defaultRate} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>计费方式</FieldLabel>
            <AppSelect
              title="选择计费方式"
              value={form.billingType}
              options={billingTypeOptions}
              onChange={(value) => updateForm({ billingType: value as BillingType })}
            />
          </div>
          <div>
            <FieldLabel>App内提前提醒</FieldLabel>
            <AppSelect
              title="选择 App 内提醒时间"
              value={form.reminderMinutesBefore}
              options={reminderOptions}
              onChange={(value) => updateForm({ reminderMinutesBefore: value })}
            />
            <p className="mt-1 text-xs leading-5 text-slate-500">打开 App 时，会根据该时间显示提醒；暂不支持系统通知。</p>
          </div>
        </div>

        <div>
          <FieldLabel>地点</FieldLabel>
          <input
            className={fieldClassName()}
            value={form.location}
            onChange={(event) => updateForm({ location: event.target.value })}
            placeholder="线上 / 学生家 / 图书馆"
          />
        </div>

        <label className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.postClassReminderEnabled}
            onChange={(event) => updateForm({ postClassReminderEnabled: event.target.checked })}
            className="h-4 w-4 accent-mint"
          />
          课后提醒我补充课堂内容
        </label>

        <div>
          <FieldLabel>备注</FieldLabel>
          <textarea
            className={textareaClassName()}
            value={form.note}
            onChange={(event) => updateForm({ note: event.target.value })}
            placeholder="上课偏好、交通说明等"
          />
        </div>

        <div className="sticky bottom-0 z-10 -mx-1 grid grid-cols-2 gap-3 border-t border-neutral-100 bg-paper/95 py-4 backdrop-blur">
          <ActionButton onClick={onCancel}>取消</ActionButton>
          <ActionButton variant="primary" type="submit">
            保存课程
          </ActionButton>
        </div>
    </form>
  );
}

function InstanceCard({
  instance,
  onRecord,
  onEdit,
  onDelete,
  onPause,
}: {
  instance: ScheduleInstance;
  onRecord: (instance: ScheduleInstance) => void;
  onEdit: (schedule: ScheduleModel) => void;
  onDelete: (schedule: ScheduleModel) => void;
  onPause: (schedule: ScheduleModel) => void;
}) {
  const schedule = instance.schedule;
  const studentDisplay = getStudentDisplay(instance.student, schedule);
  const displayStatus = getCourseTodoDisplayStatus(instance);
  const reminderActive = isWithinReminderWindow(instance);
  const reminderWindow = getScheduleReminderWindow(schedule);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {schedule.startTime}-{schedule.endTime}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {studentDisplay.name} · {instance.subject}
          </p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClassName(instance.status)}`}>
          {instanceStatusLabel[instance.status]}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{displayStatus.text}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-md bg-slate-50 px-2 py-1">{typeLabel[schedule.scheduleType]}</span>
        {schedule.location ? <span className="rounded-md bg-slate-50 px-2 py-1">{schedule.location}</span> : null}
        <span className="rounded-md bg-slate-50 px-2 py-1">
          {schedule.reminderMinutesBefore === undefined
            ? 'App内默认提前120分钟提醒'
            : reminderWindow > 0
              ? `App内提前${reminderWindow}分钟提醒`
              : '未开启App内提前提醒'}
        </span>
        {reminderActive ? <span className="rounded-md bg-stone-100 px-2 py-1 text-stone-800">提醒中</span> : null}
      </div>

      <div className="mt-4 grid gap-2">
        <ActionButton
          variant={instance.status === 'ended_pending_record' ? 'primary' : 'secondary'}
          className={`w-full ${instance.status === 'recorded' ? 'opacity-60' : ''}`}
          onClick={() => onRecord(instance)}
          disabled={instance.status === 'recorded'}
        >
          {instance.status === 'recorded' ? '已记录' : '记录课时'}
        </ActionButton>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton className="inline-flex items-center justify-center gap-2" onClick={() => onEdit(schedule)}>
            <Edit2 className="h-4 w-4" />
            编辑
          </ActionButton>
          <ActionButton
            className="inline-flex items-center justify-center gap-2 text-slate-500"
            onClick={() => (schedule.scheduleType === 'recurring' ? onPause(schedule) : onDelete(schedule))}
          >
            {schedule.scheduleType === 'recurring' ? <Pause className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            {schedule.scheduleType === 'recurring' ? '暂停' : '删除'}
          </ActionButton>
        </div>
      </div>
    </Card>
  );
}

function RecurringScheduleCard({
  schedule,
  student,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  schedule: ScheduleModel;
  student?: Student;
  onEdit: (schedule: ScheduleModel) => void;
  onToggleStatus: (schedule: ScheduleModel) => void;
  onDelete: (schedule: ScheduleModel) => void;
}) {
  const studentDisplay = getStudentDisplay(student, schedule);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">{studentDisplay.name}</p>
          <p className="mt-1 text-sm text-slate-500">{schedule.subject || studentDisplay.subject}</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {statusLabel[schedule.status]}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">重复</dt>
          <dd className="mt-1 font-semibold">{summarizeWeekdays(schedule.repeatRule?.weekdays ?? [])}</dd>
        </div>
        <div>
          <dt className="text-slate-500">时间</dt>
          <dd className="mt-1 font-semibold">
            {schedule.startTime}-{schedule.endTime}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">默认时长</dt>
          <dd className="mt-1 font-semibold">{formatDuration(schedule.defaultDuration)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">默认单价</dt>
          <dd className="mt-1 font-semibold">{formatMoney(schedule.defaultRate)}</dd>
        </div>
      </dl>

      {schedule.note ? <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{schedule.note}</p> : null}

      <div className="mt-4 grid gap-2">
        <ActionButton className="inline-flex w-full items-center justify-center gap-2" onClick={() => onEdit(schedule)}>
          <Edit2 className="h-4 w-4" />
          编辑
        </ActionButton>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton className="inline-flex items-center justify-center gap-2" onClick={() => onToggleStatus(schedule)}>
            {schedule.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {schedule.status === 'active' ? '暂停' : '恢复'}
          </ActionButton>
          <ActionButton className="inline-flex items-center justify-center gap-2 text-slate-500" onClick={() => onDelete(schedule)}>
            <Trash2 className="h-4 w-4" />
            删除
          </ActionButton>
        </div>
      </div>
    </Card>
  );
}

export function Schedule({ onCreateStudent, onOpenLessonEditor, onEditingChange = () => undefined }: ScheduleProps) {
  const { students } = useStudents();
  const { lessons, addLesson } = useLessons();
  const { schedules, addSchedule, updateSchedule, deleteSchedule, updateScheduleStatus } = useSchedules();
  const [activeView, setActiveView] = useState<ScheduleView>('today');
  const [formState, setFormState] = useState<ScheduleFormState | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleModel | null>(null);
  const [notice, setNotice] = useState('');
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirmDialog();

  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const todayInstances = useMemo(
    () => getTodayScheduleInstances(schedules, lessons, students),
    [schedules, lessons, students],
  );
  const weekInstances = useMemo(
    () => getWeekScheduleInstances(schedules, lessons, students),
    [schedules, lessons, students],
  );
  const weekGroups = useMemo(() => groupScheduleInstancesByDate(weekInstances), [weekInstances]);
  const recurringSchedules = schedules.filter((schedule) => schedule.scheduleType === 'recurring');
  const hasSchedules = schedules.length > 0;
  const scheduleFormTitle = editingSchedule
    ? '编辑课程'
    : formState?.scheduleType === 'recurring'
      ? '新增固定课程'
      : '新增临时课程';

  useEffect(() => {
    onEditingChange(Boolean(formState));
    return () => onEditingChange(false);
  }, [formState, onEditingChange]);

  function openCreateForm(scheduleType: ScheduleType) {
    setEditingSchedule(null);
    setFormState(createEmptyForm(students, scheduleType));
    setNotice('');
    setCreatedLessonId(null);
  }

  function openEditForm(schedule: ScheduleModel) {
    setEditingSchedule(schedule);
    setFormState(scheduleToForm(schedule));
    setNotice('');
    setCreatedLessonId(null);
  }

  function closeForm() {
    setEditingSchedule(null);
    setFormState(null);
  }

  function handleSave(input: ScheduleInput) {
    const selectedStudent = students.find((student) => student.id === input.studentId);
    const snapshot = selectedStudent
      ? createStudentSnapshot(selectedStudent)
      : editingSchedule?.studentId === input.studentId
        ? createDeletedStudentSnapshot(editingSchedule)
        : createDeletedStudentSnapshot();
    const normalizedInput = { ...input, ...snapshot };

    if (editingSchedule) {
      updateSchedule(editingSchedule.id, normalizedInput);
      setNotice('课程已更新');
      showToast('课程已更新');
    } else {
      addSchedule(normalizedInput);
      setNotice('课程已保存');
      showToast('课程已保存');
    }

    closeForm();
  }

  async function handleDelete(schedule: ScheduleModel) {
    const confirmed = await confirm({
      title: '删除课程安排',
      description: '确定删除这节课程安排吗？已经生成的课时记录不会被删除。',
      confirmText: '删除',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    deleteSchedule(schedule.id);
    setNotice('课程安排已删除');
    showToast('课程安排已删除');
  }

  function handleToggleStatus(schedule: ScheduleModel) {
    updateScheduleStatus(schedule.id, schedule.status === 'active' ? 'paused' : 'active');
    setNotice(schedule.status === 'active' ? '固定课程已暂停' : '固定课程已恢复');
    showToast(schedule.status === 'active' ? '固定课程已暂停' : '固定课程已恢复', 'info');
  }

  function handleRecordLesson(instance: ScheduleInstance) {
    if (hasGeneratedLesson(instance.schedule.id, instance.date, lessons)) {
      showToast('这节课已经记录过了', 'info');
      return;
    }

    const lesson = addLesson(createLessonFromSchedule(instance.schedule, instance.date, instance.student));
    setCreatedLessonId(lesson.id);
    setNotice('课时已记录，可在记录页补充课堂内容。');
    showToast('课时已记录');
  }

  if (formState) {
    return (
      <div className="edit-page-transition -mx-4 -mt-6 min-h-screen bg-paper px-4 pt-6">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={closeForm}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
          <h1 className="text-xl font-semibold text-neutral-900">{scheduleFormTitle}</h1>
        </div>
        <ScheduleForm
          key={editingSchedule?.id ?? formState.scheduleType}
          students={students}
          initialValue={formState}
          onCancel={closeForm}
          onSave={handleSave}
        />
      </div>
    );
  }

  function renderInstanceList(instances: ScheduleInstance[], emptyText: string) {
    if (instances.length === 0) {
      return (
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-500">{emptyText}</p>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {instances.map((instance) => (
          <InstanceCard
            key={instance.id}
            instance={instance}
            onRecord={handleRecordLesson}
            onEdit={openEditForm}
            onDelete={handleDelete}
            onPause={handleToggleStatus}
          />
        ))}
      </div>
    );
  }

  if (students.length === 0 && schedules.length === 0) {
    return (
      <div>
        <PageHeader title="课程表" />
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-500">还没有学生，先添加学生后再安排课程。</p>
          <ActionButton variant="primary" className="mt-4" onClick={onCreateStudent}>
            去添加学生
          </ActionButton>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="课程表" />
      {confirmDialog}

      <div className="mb-4 grid grid-cols-3 rounded-lg border border-line bg-white p-1">
        {viewTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveView(tab.id)}
            className={`h-9 rounded-md text-sm font-medium ${activeView === tab.id ? 'bg-mint text-white' : 'text-slate-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {students.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <ActionButton variant="primary" className="inline-flex items-center justify-center gap-2" onClick={() => openCreateForm('recurring')}>
            <Plus className="h-4 w-4" />
            新增固定课程
          </ActionButton>
          <ActionButton className="inline-flex items-center justify-center gap-2" onClick={() => openCreateForm('one_time')}>
            <Plus className="h-4 w-4" />
            新增临时课程
          </ActionButton>
        </div>
      ) : null}

      {notice ? (
        <Card className="mb-4 border-neutral-200 bg-neutral-50">
          <p className="text-sm text-neutral-700">{notice}</p>
          {createdLessonId ? (
            <ActionButton className="mt-3 w-full" onClick={() => onOpenLessonEditor(createdLessonId)}>
              去补充内容
            </ActionButton>
          ) : null}
        </Card>
      ) : null}

      {!hasSchedules ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-500">还没有课程安排，先添加一节固定课或临时课吧。</p>
        </Card>
      ) : null}

      {hasSchedules && activeView === 'today' ? (
        <>
          <SectionTitle>今日课程</SectionTitle>
          {renderInstanceList(todayInstances, '今天没有课程安排。')}
        </>
      ) : null}

      {hasSchedules && activeView === 'week' ? (
        <>
          <SectionTitle>本周课程</SectionTitle>
          {weekInstances.length === 0 ? (
            <Card className="py-10 text-center">
              <p className="text-sm text-slate-500">本周还没有课程安排。</p>
            </Card>
          ) : (
            <div className="space-y-5">
              {getWeekRange().dates
                .filter((date) => weekGroups[date]?.length)
                .map((date) => (
                  <div key={date}>
                    <p className="mb-2 text-sm font-semibold text-slate-600">
                      {formatWeekday(getWeekday(date))} {formatMonthDay(date)}
                    </p>
                    {renderInstanceList(weekGroups[date], '本日没有课程安排。')}
                  </div>
                ))}
            </div>
          )}
        </>
      ) : null}

      {hasSchedules && activeView === 'recurring' ? (
        <>
          <SectionTitle>固定课程</SectionTitle>
          {recurringSchedules.length === 0 ? (
            <Card className="py-10 text-center">
              <p className="text-sm text-slate-500">还没有固定课程。</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {recurringSchedules.map((schedule) => (
                <RecurringScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  student={studentMap.get(schedule.studentId)}
                  onEdit={openEditForm}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
