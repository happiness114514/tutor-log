import { ArrowLeft, BookOpen, ChevronRight, Copy, Edit2, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ActionButton } from '../components/ActionButton';
import { AppSelect } from '../components/AppSelect';
import { Card } from '../components/Card';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { useAppSettings } from '../store/useAppSettings';
import { useLessons } from '../store/useLessons';
import { useSchedules } from '../store/useSchedules';
import { useStudents, type StudentInput } from '../store/useStudents';
import type { BillingType, Lesson, LessonStatus, Schedule, ScheduleStatus, ScheduleType, SettlementCycle, Student } from '../types';
import { copyTextToClipboard } from '../utils/clipboard';
import { formatDuration, formatMoney } from '../utils/dashboardStats';
import {
  formatLessonDateTime,
  generateSettlementText,
  getLessonStatusLabel,
  type SettlementStudentSummary,
} from '../utils/settlementStats';
import {
  getRecentTeachingNotes,
  getStudentLessons,
  getStudentSchedules,
  getStudentStats,
  getStudentUnsettledLessons,
  type StudentStats,
} from '../utils/studentStats';
import { formatMonthDay, formatWeekday } from '../utils/scheduleUtils';
import { showToast } from '../utils/toast';

type StudentFormState = {
  name: string;
  grade: string;
  subject: string;
  defaultRate: string;
  defaultDuration: string;
  billingType: BillingType;
  settlementCycle: SettlementCycle;
  parentContact: string;
  note: string;
  isActive: boolean;
};

type StudentFormErrors = Partial<Record<keyof StudentFormState, string>>;

function createEmptyForm(defaultDuration: number, defaultSettlementCycle: SettlementCycle): StudentFormState {
  return {
    name: '',
    grade: '',
    subject: '',
    defaultRate: '150',
    defaultDuration: String(defaultDuration),
    billingType: 'hourly',
    settlementCycle: defaultSettlementCycle,
    parentContact: '',
    note: '',
    isActive: true,
  };
}

const billingTypeLabel: Record<BillingType, string> = {
  hourly: '按小时',
  per_session: '按次',
};

const settlementCycleLabel: Record<SettlementCycle, string> = {
  per_session: '按次',
  weekly: '每周',
  monthly: '每月',
  custom: '自定义',
};

const billingTypeOptions = [
  { value: 'hourly', label: '按小时' },
  { value: 'per_session', label: '按次' },
];

const settlementCycleOptions = [
  { value: 'per_session', label: '按次' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'custom', label: '自定义' },
];

const scheduleTypeLabel: Record<ScheduleType, string> = {
  recurring: '固定',
  one_time: '临时',
};

const scheduleStatusLabel: Record<ScheduleStatus, string> = {
  active: '启用',
  paused: '暂停',
  ended: '已结束',
};

const lessonStatusClassName: Record<LessonStatus, string> = {
  completed: 'bg-neutral-100 text-neutral-700',
  makeup: 'bg-sky-50 text-sky-700',
  trial: 'bg-violet-50 text-violet-700',
  leave: 'bg-amber-50 text-amber-800',
  cancelled: 'bg-rose-50 text-rose-700',
};

function studentToForm(student: Student): StudentFormState {
  return {
    name: student.name,
    grade: student.grade ?? '',
    subject: student.subject ?? '',
    defaultRate: String(student.defaultRate),
    defaultDuration: String(student.defaultDuration),
    billingType: student.billingType,
    settlementCycle: student.settlementCycle,
    parentContact: student.parentContact ?? '',
    note: student.note ?? '',
    isActive: student.isActive,
  };
}

function toStudentInput(form: StudentFormState): StudentInput {
  return {
    name: form.name,
    grade: form.grade,
    subject: form.subject,
    defaultRate: Number(form.defaultRate),
    defaultDuration: Number(form.defaultDuration),
    billingType: form.billingType,
    settlementCycle: form.settlementCycle,
    parentContact: form.parentContact,
    note: form.note,
    isActive: form.isActive,
  };
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {children}
      {required ? <span className="ml-1 text-coral">*</span> : null}
    </label>
  );
}

function inputClassName(hasError = false) {
  return `h-11 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition focus:ring-2 ${
    hasError
      ? 'border-coral focus:border-coral focus:ring-coral/15'
      : 'border-line focus:border-mint focus:ring-mint/15'
  }`;
}

function textareaClassName(hasError = false) {
  return `min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:ring-2 ${
    hasError
      ? 'border-coral focus:border-coral focus:ring-coral/15'
      : 'border-line focus:border-mint focus:ring-mint/15'
  }`;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-coral">{message}</p> : null;
}

function emptyText(value?: string) {
  return value || '未填写';
}

function truncateText(value?: string, length = 34) {
  if (!value) {
    return undefined;
  }

  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function lessonTimeText(lesson: Lesson) {
  if (lesson.startTime && lesson.endTime) {
    return `${lesson.startTime}-${lesson.endTime}`;
  }

  return '未填写时间';
}

function scheduleTimeText(schedule: Schedule) {
  return `${schedule.startTime}-${schedule.endTime}`;
}

function scheduleDateText(schedule: Schedule) {
  if (schedule.scheduleType === 'recurring') {
    const weekdays = schedule.repeatRule?.weekdays ?? [];
    return weekdays.length ? weekdays.map(formatWeekday).join('、') : '未设置重复日期';
  }

  return schedule.date ? formatMonthDay(schedule.date) : '未填写日期';
}

interface StudentFormProps {
  initialValue: StudentFormState;
  onCancel: () => void;
  onSave: (input: StudentInput) => void;
}

function StudentForm({ initialValue, onCancel, onSave }: StudentFormProps) {
  const [form, setForm] = useState<StudentFormState>(initialValue);
  const [errors, setErrors] = useState<StudentFormErrors>({});
  const fieldRefs = useRef<
    Partial<Record<keyof StudentFormState, HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>
  >({});

  function setFieldRef(key: keyof StudentFormState) {
    return (element: HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
      fieldRefs.current[key] = element;
    };
  }

  function focusField(key: keyof StudentFormState) {
    window.setTimeout(() => {
      const field = fieldRefs.current[key];
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field?.focus({ preventScroll: true });
    }, 0);
  }

  function updateField<K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validateForm() {
    const nextErrors: StudentFormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = '请输入学生姓名';
    }

    if (!form.defaultRate) {
      nextErrors.defaultRate = '请输入默认单价';
    } else if (Number(form.defaultRate) <= 0 || Number.isNaN(Number(form.defaultRate))) {
      nextErrors.defaultRate = '默认单价需要是大于 0 的数字';
    }

    if (!form.defaultDuration) {
      nextErrors.defaultDuration = '请输入默认课程时长';
    } else if (Number(form.defaultDuration) <= 0 || Number.isNaN(Number(form.defaultDuration))) {
      nextErrors.defaultDuration = '默认课程时长需要是大于 0 的数字';
    }

    if (!form.billingType) {
      nextErrors.billingType = '请选择计费方式';
    }

    if (!form.settlementCycle) {
      nextErrors.settlementCycle = '请选择结算周期';
    }

    return nextErrors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm();
    const firstError = Object.keys(nextErrors)[0] as keyof StudentFormErrors | undefined;

    if (firstError) {
      setErrors(nextErrors);
      focusField(firstError);
      return;
    }

    setErrors({});
    onSave(toStudentInput(form));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-2">

        <div>
          <FieldLabel required>姓名</FieldLabel>
          <input
            ref={setFieldRef('name')}
            data-form-autofocus="true"
            className={inputClassName(Boolean(errors.name))}
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="例如：小明"
          />
          <FieldError message={errors.name} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>年级</FieldLabel>
            <input
              ref={setFieldRef('grade')}
              className={inputClassName()}
              value={form.grade}
              onChange={(event) => updateField('grade', event.target.value)}
              placeholder="初二"
            />
          </div>
          <div>
            <FieldLabel>科目</FieldLabel>
            <input
              ref={setFieldRef('subject')}
              className={inputClassName()}
              value={form.subject}
              onChange={(event) => updateField('subject', event.target.value)}
              placeholder="数学"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>默认单价</FieldLabel>
            <input
              ref={setFieldRef('defaultRate')}
              className={inputClassName(Boolean(errors.defaultRate))}
              type="number"
              min="1"
              step="1"
              value={form.defaultRate}
              onChange={(event) => updateField('defaultRate', event.target.value)}
            />
            <FieldError message={errors.defaultRate} />
          </div>
          <div>
            <FieldLabel required>课程时长</FieldLabel>
            <input
              ref={setFieldRef('defaultDuration')}
              className={inputClassName(Boolean(errors.defaultDuration))}
              type="number"
              min="0.5"
              step="0.5"
              value={form.defaultDuration}
              onChange={(event) => updateField('defaultDuration', event.target.value)}
            />
            <FieldError message={errors.defaultDuration} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>计费方式</FieldLabel>
            <AppSelect
              ref={setFieldRef('billingType')}
              title="选择计费方式"
              hasError={Boolean(errors.billingType)}
              value={form.billingType}
              options={billingTypeOptions}
              onChange={(value) => updateField('billingType', value as BillingType)}
            />
            <FieldError message={errors.billingType} />
          </div>
          <div>
            <FieldLabel required>结算周期</FieldLabel>
            <AppSelect
              ref={setFieldRef('settlementCycle')}
              title="选择结算周期"
              hasError={Boolean(errors.settlementCycle)}
              value={form.settlementCycle}
              options={settlementCycleOptions}
              onChange={(value) => updateField('settlementCycle', value as SettlementCycle)}
            />
            <FieldError message={errors.settlementCycle} />
          </div>
        </div>

        <div>
          <FieldLabel>家长联系方式</FieldLabel>
          <input
            ref={setFieldRef('parentContact')}
            className={inputClassName()}
            value={form.parentContact}
            onChange={(event) => updateField('parentContact', event.target.value)}
            placeholder="手机号或微信"
          />
        </div>

        <div>
          <FieldLabel>备注</FieldLabel>
          <textarea
            ref={setFieldRef('note')}
            className={textareaClassName()}
            value={form.note}
            onChange={(event) => updateField('note', event.target.value)}
            placeholder="学习情况、上课偏好等"
          />
        </div>

        <label className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => updateField('isActive', event.target.checked)}
            className="h-4 w-4 accent-mint"
          />
          是否活跃
        </label>

        <div className="sticky bottom-0 z-10 -mx-1 grid grid-cols-2 gap-3 border-t border-neutral-100 bg-paper/95 py-4 backdrop-blur">
          <ActionButton onClick={onCancel}>取消</ActionButton>
          <ActionButton variant="primary" type="submit">
            保存学生
          </ActionButton>
        </div>
    </form>
  );
}

function StudentCard({
  student,
  stats,
  onOpen,
  onEdit,
  onDelete,
}: {
  student: Student;
  stats: StudentStats;
  onOpen: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}) {
  const noteSummary = student.note && student.note.length > 26 ? `${student.note.slice(0, 26)}...` : student.note;

  return (
    <Card>
      <button type="button" onClick={() => onOpen(student)} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-ink">{student.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {student.grade || '未填写年级'} · {student.subject || '未填写科目'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                student.isActive ? 'bg-neutral-100 text-neutral-700' : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {student.isActive ? '活跃' : '停用'}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-500">默认单价</dt>
            <dd className="mt-1 font-semibold">{formatMoney(student.defaultRate)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">默认时长</dt>
            <dd className="mt-1 font-semibold">{formatDuration(student.defaultDuration)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">本月课时</dt>
            <dd className="mt-1 font-semibold">{formatDuration(stats.monthlyDuration)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">未结算</dt>
            <dd className="mt-1 font-semibold text-neutral-950">{formatMoney(stats.unsettledAmount)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-slate-500">最近上课：{stats.recentLessonDate ?? '暂无记录'}</p>
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {noteSummary || '暂无备注'}
        </p>
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ActionButton className="inline-flex items-center justify-center gap-2" onClick={() => onEdit(student)}>
          <Edit2 className="h-4 w-4" />
          编辑
        </ActionButton>
        <button
          type="button"
          onClick={() => onDelete(student)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-slate-500"
        >
          <Trash2 className="h-4 w-4" />
          删除
        </button>
      </div>
    </Card>
  );
}

function createStudentSettlementSummary(student: Student, unsettledLessons: Lesson[]): SettlementStudentSummary {
  return {
    studentId: student.id,
    student,
    studentName: student.name,
    subject: student.subject ?? '未填写科目',
    lessons: unsettledLessons,
    lessonCount: unsettledLessons.length,
    duration: unsettledLessons.reduce((sum, lesson) => sum + lesson.duration, 0),
    amount: unsettledLessons.reduce((sum, lesson) => sum + lesson.amount, 0),
    latestLessonDate: unsettledLessons[0]?.date,
  };
}

function StatGrid({ stats }: { stats: StudentStats }) {
  const items = [
    { label: '累计课时', value: formatDuration(stats.totalDuration) },
    { label: '累计收入', value: formatMoney(stats.totalIncome) },
    { label: '本月课时', value: formatDuration(stats.monthlyDuration) },
    { label: '本月应收', value: formatMoney(stats.monthlyReceivable) },
    { label: '已结算', value: formatMoney(stats.settledAmount) },
    { label: '未结算', value: formatMoney(stats.unsettledAmount), highlight: true },
    { label: '累计上课', value: `${stats.lessonCount}次` },
  ];

  return (
    <Card className="p-0">
      <div className="grid grid-cols-2 divide-x divide-y divide-neutral-100 overflow-hidden rounded-2xl">
        {items.map((item) => (
          <div key={item.label} className="p-4">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className={`mt-2 text-lg font-semibold ${item.highlight ? 'text-neutral-950' : 'text-ink'}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StudentSettingsSummary({ student }: { student: Student }) {
  const rows = [
    ['默认单价', formatMoney(student.defaultRate)],
    ['默认时长', formatDuration(student.defaultDuration)],
    ['计费方式', billingTypeLabel[student.billingType]],
    ['结算周期', settlementCycleLabel[student.settlementCycle]],
    ['家长联系方式', emptyText(student.parentContact)],
    ['备注', emptyText(student.note)],
  ];

  return (
    <Card>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="max-w-[60%] text-right text-sm font-medium text-ink">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StudentSchedulesSection({ schedules }: { schedules: Schedule[] }) {
  const visibleSchedules = schedules.slice(0, 6);

  if (visibleSchedules.length === 0) {
    return (
      <Card className="py-8 text-center">
        <p className="text-sm text-slate-500">该学生还没有课程安排。</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {visibleSchedules.map((schedule) => (
        <Card key={schedule.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">
                {scheduleTypeLabel[schedule.scheduleType]} · {scheduleDateText(schedule)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {scheduleTimeText(schedule)} · {emptyText(schedule.subject)}
              </p>
              <p className="mt-2 text-xs text-slate-500">地点：{emptyText(schedule.location)}</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
              {scheduleStatusLabel[schedule.status]}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function LessonBadge({ lesson }: { lesson: Lesson }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${lessonStatusClassName[lesson.status]}`}>
      {getLessonStatusLabel(lesson.status)}
    </span>
  );
}

function SettlementBadge({ isSettled }: { isSettled: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${
        isSettled ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
      }`}
    >
      {isSettled ? '已结算' : '未结算'}
    </span>
  );
}

function StudentUnsettledSection({
  summary,
  onCopy,
  onSettleLesson,
  onSettleAll,
}: {
  summary: SettlementStudentSummary;
  onCopy: () => void;
  onSettleLesson: (lesson: Lesson) => void;
  onSettleAll: () => void;
}) {
  if (summary.lessons.length === 0) {
    return (
      <Card className="py-8 text-center">
        <p className="text-sm text-slate-500">该学生暂无未结算课时。</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-3">
        {summary.lessons.map((lesson) => (
          <div key={lesson.id} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{formatLessonDateTime(lesson)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDuration(lesson.duration)} · {lessonTimeText(lesson)}
                </p>
              </div>
              <p className="text-lg font-semibold text-neutral-950">{formatMoney(lesson.amount)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <LessonBadge lesson={lesson} />
              <ActionButton className="h-9" onClick={() => onSettleLesson(lesson)}>
                标记本节已收款
              </ActionButton>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-white p-3 text-sm ring-1 ring-neutral-100">
        <p className="font-semibold text-ink">未结算合计</p>
        <p className="mt-2 text-slate-600">
          {summary.lessonCount} 次课 · {formatDuration(summary.duration)} · {formatMoney(summary.amount)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ActionButton className="inline-flex items-center justify-center gap-2" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          复制账单
        </ActionButton>
        <ActionButton variant="primary" onClick={onSettleAll}>
          标记全部已收款
        </ActionButton>
      </div>
    </Card>
  );
}

function StudentHistorySection({
  lessons,
  showAll,
  onToggleShowAll,
}: {
  lessons: Lesson[];
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const visibleLessons = showAll ? lessons : lessons.slice(0, 5);

  if (lessons.length === 0) {
    return (
      <Card className="py-8 text-center">
        <p className="text-sm text-slate-500">还没有课时记录。</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        {visibleLessons.map((lesson) => (
          <div key={lesson.id} className="border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{formatLessonDateTime(lesson)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDuration(lesson.duration)} · {formatMoney(lesson.amount)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <LessonBadge lesson={lesson} />
                <SettlementBadge isSettled={lesson.isSettled} />
              </div>
            </div>
            {lesson.content ? <p className="mt-3 text-sm text-slate-600">课堂内容：{truncateText(lesson.content)}</p> : null}
            {lesson.homework ? <p className="mt-1 text-sm text-slate-500">作业：{truncateText(lesson.homework)}</p> : null}
          </div>
        ))}
      </div>
      {lessons.length > 5 ? (
        <ActionButton className="mt-4 w-full" onClick={onToggleShowAll}>
          {showAll ? '收起' : '查看全部'}
        </ActionButton>
      ) : null}
    </Card>
  );
}

function TeachingNotesSection({ notes }: { notes: Lesson[] }) {
  if (notes.length === 0) {
    return (
      <Card className="py-8 text-center">
        <p className="text-sm text-slate-500">还没有教学记录，记录课时时可以补充课堂内容和作业。</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((lesson) => (
        <Card key={lesson.id}>
          <p className="text-sm font-semibold text-ink">{formatLessonDateTime(lesson)}</p>
          {lesson.content ? <p className="mt-3 text-sm text-slate-600">课堂内容：{truncateText(lesson.content, 46)}</p> : null}
          {lesson.homework ? <p className="mt-2 text-sm text-slate-600">作业：{truncateText(lesson.homework, 46)}</p> : null}
          {lesson.note ? <p className="mt-2 text-sm text-slate-500">备注：{truncateText(lesson.note, 46)}</p> : null}
        </Card>
      ))}
    </div>
  );
}

function StudentDetail({
  student,
  lessons,
  schedules,
  onBack,
  onEdit,
  onCreateLesson,
  onNavigateToSchedule,
  onSettleLessons,
}: {
  student: Student;
  lessons: Lesson[];
  schedules: Schedule[];
  onBack: () => void;
  onEdit: (student: Student) => void;
  onCreateLesson: () => void;
  onNavigateToSchedule: () => void;
  onSettleLessons: (ids: string[]) => void;
}) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();
  const studentLessons = getStudentLessons(student.id, lessons);
  const studentSchedules = getStudentSchedules(student.id, schedules);
  const stats = getStudentStats(student, studentLessons);
  const unsettledLessons = getStudentUnsettledLessons(student.id, lessons);
  const settlementSummary = createStudentSettlementSummary(student, unsettledLessons);
  const teachingNotes = getRecentTeachingNotes(student.id, lessons, 3);

  async function handleCopySettlement() {
    if (settlementSummary.lessons.length === 0) {
      showToast('该学生暂无未结算课时', 'info');
      return;
    }

    try {
      await copyTextToClipboard(generateSettlementText(settlementSummary));
      showToast('结算明细已复制');
    } catch {
      showToast('复制失败，请手动复制', 'error');
    }
  }

  async function handleSettleLesson(lesson: Lesson) {
    const confirmed = await confirm({
      title: '标记已收款',
      description: `确定将 ${student.name} ${lesson.date} 的课时标记为已结算吗？`,
      confirmText: '标记已收款',
    });
    if (!confirmed) {
      return;
    }

    onSettleLessons([lesson.id]);
    showToast('已标记本节已收款');
  }

  async function handleSettleAll() {
    if (settlementSummary.lessons.length === 0) {
      showToast('该学生暂无未结算课时', 'info');
      return;
    }

    const confirmed = await confirm({
      title: '标记全部已收款',
      description: `确定将 ${student.name} 的 ${settlementSummary.lessonCount} 节课标记为已结算吗？`,
      confirmText: '标记已收款',
    });
    if (!confirmed) {
      return;
    }

    onSettleLessons(settlementSummary.lessons.map((lesson) => lesson.id));
    showToast('已标记全部已收款');
  }

  return (
    <div>
      {confirmDialog}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <ActionButton className="inline-flex items-center justify-center gap-2" onClick={() => onEdit(student)}>
          <Edit2 className="h-4 w-4" />
          编辑学生
        </ActionButton>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold text-ink">{student.name}</p>
            <p className="mt-2 text-sm text-slate-500">
              {student.grade || '未填写年级'} · {student.subject || '未填写科目'}
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
            {student.isActive ? '活跃' : '已停用'}
          </span>
        </div>
      </Card>

      <SectionTitle>数据概览</SectionTitle>
      <StatGrid stats={stats} />

      <SectionTitle>学生设置</SectionTitle>
      <StudentSettingsSummary student={student} />

      <SectionTitle>课程安排</SectionTitle>
      <StudentSchedulesSection schedules={studentSchedules} />

      <SectionTitle>未结算明细</SectionTitle>
      <StudentUnsettledSection
        summary={settlementSummary}
        onCopy={handleCopySettlement}
        onSettleLesson={handleSettleLesson}
        onSettleAll={handleSettleAll}
      />

      <SectionTitle>历史课时</SectionTitle>
      <StudentHistorySection
        lessons={studentLessons}
        showAll={showAllHistory}
        onToggleShowAll={() => setShowAllHistory((current) => !current)}
      />

      <SectionTitle>最近教学记录</SectionTitle>
      <TeachingNotesSection notes={teachingNotes} />

      <SectionTitle>快捷操作</SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton variant="primary" className="inline-flex items-center justify-center gap-2" onClick={onCreateLesson}>
            <Plus className="h-4 w-4" />
            新增课时
          </ActionButton>
          <ActionButton className="inline-flex items-center justify-center gap-2" onClick={onNavigateToSchedule}>
            <BookOpen className="h-4 w-4" />
            新增课程
          </ActionButton>
          <ActionButton className="inline-flex items-center justify-center gap-2" onClick={handleCopySettlement}>
            <ReceiptText className="h-4 w-4" />
            复制账单
          </ActionButton>
          <ActionButton className="inline-flex items-center justify-center gap-2" onClick={() => onEdit(student)}>
            <Edit2 className="h-4 w-4" />
            编辑学生
          </ActionButton>
        </div>
      </Card>
    </div>
  );
}

interface StudentsProps {
  openCreateRequest?: boolean;
  onCreateRequestConsumed?: () => void;
  onCreateLesson?: () => void;
  onNavigateToSchedule?: () => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export function Students({
  openCreateRequest = false,
  onCreateRequestConsumed,
  onCreateLesson = () => undefined,
  onNavigateToSchedule = () => undefined,
  onEditingChange = () => undefined,
}: StudentsProps) {
  const { settings } = useAppSettings();
  const { students, addStudent, updateStudent, deleteStudent } = useStudents();
  const { lessons, markLessonsSettled, preserveStudentSnapshot: preserveLessonStudentSnapshot } = useLessons();
  const { schedules, preserveStudentSnapshot: preserveScheduleStudentSnapshot } = useSchedules();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirmDialog();
  const selectedStudent = selectedStudentId ? students.find((student) => student.id === selectedStudentId) : undefined;
  const studentFormTitle = editingStudent ? '编辑学生' : '新增学生';

  function openCreateForm() {
    setSelectedStudentId(null);
    setEditingStudent(null);
    setIsFormOpen(true);
  }

  useEffect(() => {
    if (openCreateRequest) {
      openCreateForm();
      onCreateRequestConsumed?.();
    }
  }, [openCreateRequest, onCreateRequestConsumed]);

  useEffect(() => {
    onEditingChange(isFormOpen);
    return () => onEditingChange(false);
  }, [isFormOpen, onEditingChange]);

  useEffect(() => {
    if (selectedStudentId && !selectedStudent) {
      setSelectedStudentId(null);
    }
  }, [selectedStudentId, selectedStudent]);

  function openEditForm(student: Student) {
    setEditingStudent(student);
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingStudent(null);
    setIsFormOpen(false);
  }

  function handleSave(input: StudentInput) {
    if (editingStudent) {
      updateStudent(editingStudent.id, input);
      showToast('学生已更新');
    } else {
      addStudent(input);
      showToast('学生已保存');
    }

    closeForm();
  }

  async function handleDelete(student: Student) {
    const lessonCount = lessons.filter((lesson) => lesson.studentId === student.id).length;
    const scheduleCount = schedules.filter((schedule) => schedule.studentId === student.id).length;
    const message =
      lessonCount > 0 || scheduleCount > 0
        ? `该学生有关联的 ${lessonCount} 条课时记录和 ${scheduleCount} 条课程安排。删除学生档案后，这些历史数据仍会保留。是否确认删除？`
        : '删除该学生后，学生档案将从学生列表中移除，但该学生的历史课时和课程记录会继续保留。是否确认删除？';
    const confirmed = await confirm({
      title: '删除学生档案',
      description: message,
      confirmText: '删除档案',
      tone: 'danger',
    });
    if (confirmed) {
      preserveLessonStudentSnapshot(student);
      preserveScheduleStudentSnapshot(student);
      deleteStudent(student.id);
      if (selectedStudentId === student.id) {
        setSelectedStudentId(null);
      }
      if (editingStudent?.id === student.id) {
        closeForm();
      }
      showToast('学生已删除');
    }
  }

  if (isFormOpen) {
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
          <h1 className="text-xl font-semibold text-neutral-900">{studentFormTitle}</h1>
        </div>
      <StudentForm
        initialValue={editingStudent ? studentToForm(editingStudent) : createEmptyForm(settings.defaultDuration, settings.defaultSettlementCycle)}
        onCancel={closeForm}
        onSave={handleSave}
      />
      </div>
    );
  }

  if (selectedStudent) {
    return (
      <div className="page-transition">
        {confirmDialog}
        <StudentDetail
          student={selectedStudent}
          lessons={lessons}
          schedules={schedules}
          onBack={() => setSelectedStudentId(null)}
          onEdit={openEditForm}
          onCreateLesson={onCreateLesson}
          onNavigateToSchedule={onNavigateToSchedule}
          onSettleLessons={markLessonsSettled}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="学生" subtitle="管理学生资料、默认收费和结算偏好" />
      {confirmDialog}

      <ActionButton variant="primary" className="mb-4 inline-flex w-full items-center justify-center gap-2" onClick={openCreateForm}>
        <Plus className="h-4 w-4" />
        新增学生
      </ActionButton>

      {students.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-500">还没有学生，先添加第一个学生吧。</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((student) => {
            const studentLessons = getStudentLessons(student.id, lessons);
            const stats = getStudentStats(student, studentLessons);

            return (
              <StudentCard
                key={student.id}
                student={student}
                stats={stats}
                onOpen={(item) => {
                  setSelectedStudentId(item.id);
                  setIsFormOpen(false);
                  setEditingStudent(null);
                }}
                onEdit={openEditForm}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
