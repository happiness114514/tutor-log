import { ChevronDown, ChevronUp, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Tag } from '../components/Tag';
import { calculateLessonAmount, useLessons, type LessonInput } from '../store/useLessons';
import { useStudents } from '../store/useStudents';
import type { BillingType, Lesson, LessonStatus, Student } from '../types';

type LessonFormState = {
  studentId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  rate: string;
  billingType: BillingType;
  amount: string;
  status: LessonStatus;
  isSettled: boolean;
  content: string;
  homework: string;
  note: string;
};

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

interface LessonsProps {
  onNavigateToStudents: () => void;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
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

function calculateFormAmount(form: Pick<LessonFormState, 'duration' | 'rate' | 'billingType' | 'status'>) {
  const duration = Number(form.duration);
  const rate = Number(form.rate);

  if (Number.isNaN(duration) || Number.isNaN(rate) || duration <= 0 || rate < 0) {
    return '0';
  }

  return String(calculateLessonAmount({ duration, rate, billingType: form.billingType, status: form.status }));
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
    amount: calculateFormAmount(form),
  };
}

function withQuickComputed(form: LessonFormState) {
  return withAutoAmount(withAutoEndTime(form));
}

function emptyForm(students: Student[]): LessonFormState {
  const firstStudent = students[0];
  const duration = firstStudent?.defaultDuration ?? 2;
  const rate = firstStudent?.defaultRate ?? 150;
  const billingType = firstStudent?.billingType ?? 'hourly';
  const status: LessonStatus = 'completed';

  return {
    studentId: firstStudent?.id ?? '',
    date: todayString(),
    startTime: '',
    endTime: '',
    duration: String(duration),
    rate: String(rate),
    billingType,
    amount: String(calculateLessonAmount({ duration, rate, billingType, status })),
    status,
    isSettled: false,
    content: '',
    homework: '',
    note: '',
  };
}

function lessonToForm(lesson: Lesson): LessonFormState {
  return {
    studentId: lesson.studentId,
    date: lesson.date,
    startTime: lesson.startTime ?? '',
    endTime: lesson.endTime ?? '',
    duration: String(lesson.duration),
    rate: String(lesson.rate),
    billingType: lesson.billingType,
    amount: String(lesson.amount),
    status: lesson.status,
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

function inputClassName() {
  return 'h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15';
}

function amountPreviewText(form: LessonFormState) {
  if (form.billingType === 'hourly') {
    return `${form.duration || 0} 小时 × ¥${form.rate || 0}/小时 = ¥${form.amount || 0}`;
  }

  return `每次 ¥${form.rate || 0} = ¥${form.amount || 0}`;
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
  const [error, setError] = useState('');
  const [isMoreOpen, setIsMoreOpen] = useState(defaultMoreOpen);
  const durationInputRef = useRef<HTMLInputElement>(null);
  const selectedStudent = students.find((student) => student.id === form.studentId);

  function updateQuickFields(partial: Partial<LessonFormState>) {
    setError('');
    setForm((current) => withQuickComputed({ ...current, ...partial }));
  }

  function handleStudentChange(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    if (!student) {
      setForm((current) => ({ ...current, studentId }));
      return;
    }

    updateQuickFields({
      studentId,
      duration: String(student.defaultDuration),
      rate: String(student.defaultRate),
      billingType: student.billingType,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.studentId) {
      setError('请选择学生。');
      return;
    }

    if (!form.date) {
      setError('请选择日期。');
      return;
    }

    if (Number(form.duration) <= 0 || Number.isNaN(Number(form.duration))) {
      setError('上课时长需要是大于 0 的数字。');
      return;
    }

    if (Number(form.rate) < 0 || Number.isNaN(Number(form.rate))) {
      setError('单价需要是数字。');
      return;
    }

    if (Number(form.amount) < 0 || Number.isNaN(Number(form.amount))) {
      setError('金额需要是数字。');
      return;
    }

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
            className={inputClassName()}
            value={form.studentId}
            onChange={(event) => handleStudentChange(event.target.value)}
            required
          >
            <option value="">请选择学生</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">科目：{selectedStudent?.subject ?? '选择学生后显示'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>日期</FieldLabel>
            <input
              className={inputClassName()}
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              required
            />
          </div>
          <div>
            <FieldLabel>开始时间</FieldLabel>
            <input
              className={inputClassName()}
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
              const active = Number(form.duration) === duration;

              return (
                <button
                  key={duration}
                  type="button"
                  onClick={() => updateQuickFields({ duration: String(duration) })}
                  className={`h-9 rounded-md border px-1 text-xs font-medium ${
                    active ? 'border-mint bg-mint text-white' : 'border-line bg-white text-slate-600'
                  }`}
                >
                  {duration}h
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => durationInputRef.current?.focus()}
              className="h-9 rounded-md border border-line bg-white px-1 text-xs font-medium text-slate-600"
            >
              自定义
            </button>
          </div>
          <input
            ref={durationInputRef}
            className={inputClassName()}
            type="number"
            min="0.5"
            step="0.5"
            value={form.duration}
            onChange={(event) => updateQuickFields({ duration: event.target.value })}
            required
          />
          <p className="mt-2 text-xs text-slate-500">
            {form.startTime ? `预计结束：${form.endTime || '待计算'}` : '不填开始时间也可以保存。'}
          </p>
        </div>

        <div className="rounded-lg border border-mint/25 bg-mint/10 p-4">
          <p className="text-xs font-medium text-mint">费用预览</p>
          <p className="mt-2 text-lg font-bold text-ink">{amountPreviewText(form)}</p>
          <p className="mt-1 text-xs text-slate-500">
            状态默认已上课，{form.isSettled ? '已结算' : '未结算'}
          </p>
        </div>

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
                <FieldLabel>课程状态</FieldLabel>
                <select
                  className={inputClassName()}
                  value={form.status}
                  onChange={(event) => updateQuickFields({ status: event.target.value as LessonStatus })}
                >
                  <option value="completed">已上课</option>
                  <option value="leave">请假</option>
                  <option value="cancelled">取消</option>
                  <option value="makeup">补课</option>
                  <option value="trial">试课</option>
                </select>
              </div>
              <div>
                <FieldLabel>计费方式</FieldLabel>
                <select
                  className={inputClassName()}
                  value={form.billingType}
                  onChange={(event) => updateQuickFields({ billingType: event.target.value as BillingType })}
                >
                  <option value="hourly">按小时</option>
                  <option value="per_session">按次</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>单价</FieldLabel>
                <input
                  className={inputClassName()}
                  type="number"
                  min="0"
                  step="1"
                  value={form.rate}
                  onChange={(event) => updateQuickFields({ rate: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel required>金额</FieldLabel>
                <input
                  className={inputClassName()}
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isSettled}
                onChange={(event) => setForm((current) => ({ ...current, isSettled: event.target.checked }))}
                className="h-4 w-4 accent-mint"
              />
              是否已结算
            </label>

            <div>
              <FieldLabel>课堂内容</FieldLabel>
              <textarea
                className="min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="本节课讲了哪些内容"
              />
            </div>

            <div>
              <FieldLabel>作业</FieldLabel>
              <textarea
                className="min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                value={form.homework}
                onChange={(event) => setForm((current) => ({ ...current, homework: event.target.value }))}
                placeholder="布置的练习或复习任务"
              />
            </div>

            <div>
              <FieldLabel>备注</FieldLabel>
              <textarea
                className="min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="特殊情况、沟通记录等"
              />
            </div>
          </div>
        ) : null}

        {error ? <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p> : null}

        <div className="grid grid-cols-2 gap-3">
          <ActionButton onClick={onCancel}>取消</ActionButton>
          <ActionButton variant="primary" type="submit" disabled={students.length === 0}>
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
        <p className="text-xl font-bold text-coral">¥{lesson.amount}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Tag active>{statusLabel[lesson.status]}</Tag>
        <Tag>{lesson.isSettled ? '已结算' : '未结算'}</Tag>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">时长</dt>
          <dd className="mt-1 font-semibold">{lesson.duration}小时</dd>
        </div>
        <div>
          <dt className="text-slate-500">单价</dt>
          <dd className="mt-1 font-semibold">¥{lesson.rate}</dd>
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

export function Lessons({ onNavigateToStudents }: LessonsProps) {
  const { students } = useStudents();
  const { lessons, addLesson, updateLesson, deleteLesson } = useLessons();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);

  function openCreateForm() {
    setEditingLesson(null);
    setIsFormOpen(true);
  }

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
    } else {
      addLesson(input);
    }

    closeForm();
  }

  function handleDelete(lesson: Lesson) {
    const student = studentMap.get(lesson.studentId);
    const confirmed = window.confirm(`确定删除 ${student?.name ?? '该学生'} 在 ${lesson.date} 的课时记录吗？`);
    if (confirmed) {
      deleteLesson(lesson.id);
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
        <LessonForm
          title={editingLesson ? '编辑课时' : '新增课时'}
          initialValue={editingLesson ? lessonToForm(editingLesson) : emptyForm(students)}
          students={students}
          defaultMoreOpen={shouldOpenMoreSettings(editingLesson)}
          isEditing={Boolean(editingLesson)}
          onCancel={closeForm}
          onSave={handleSave}
        />
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
