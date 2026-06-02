import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { useStudents, type StudentInput } from '../store/useStudents';
import type { BillingType, SettlementCycle, Student } from '../types';

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

const emptyForm: StudentFormState = {
  name: '',
  grade: '',
  subject: '',
  defaultRate: '150',
  defaultDuration: '2',
  billingType: 'hourly',
  settlementCycle: 'monthly',
  parentContact: '',
  note: '',
  isActive: true,
};

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

function inputClassName() {
  return 'h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15';
}

interface StudentFormProps {
  initialValue: StudentFormState;
  title: string;
  onCancel: () => void;
  onSave: (input: StudentInput) => void;
}

function StudentForm({ initialValue, title, onCancel, onSave }: StudentFormProps) {
  const [form, setForm] = useState<StudentFormState>(initialValue);
  const [error, setError] = useState('');

  const canSave = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      Number(form.defaultRate) > 0 &&
      Number(form.defaultDuration) > 0
    );
  }, [form]);

  function updateField<K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('请填写学生姓名。');
      return;
    }

    if (Number(form.defaultRate) <= 0 || Number.isNaN(Number(form.defaultRate))) {
      setError('默认单价需要是大于 0 的数字。');
      return;
    }

    if (Number(form.defaultDuration) <= 0 || Number.isNaN(Number(form.defaultDuration))) {
      setError('默认课程时长需要是大于 0 的数字。');
      return;
    }

    onSave(toStudentInput(form));
  }

  return (
    <Card className="mb-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
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
          <FieldLabel required>姓名</FieldLabel>
          <input
            className={inputClassName()}
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="例如：小明"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>年级</FieldLabel>
            <input
              className={inputClassName()}
              value={form.grade}
              onChange={(event) => updateField('grade', event.target.value)}
              placeholder="初二"
            />
          </div>
          <div>
            <FieldLabel>科目</FieldLabel>
            <input
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
              className={inputClassName()}
              type="number"
              min="1"
              step="1"
              value={form.defaultRate}
              onChange={(event) => updateField('defaultRate', event.target.value)}
              required
            />
          </div>
          <div>
            <FieldLabel required>课程时长</FieldLabel>
            <input
              className={inputClassName()}
              type="number"
              min="0.5"
              step="0.5"
              value={form.defaultDuration}
              onChange={(event) => updateField('defaultDuration', event.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>计费方式</FieldLabel>
            <select
              className={inputClassName()}
              value={form.billingType}
              onChange={(event) => updateField('billingType', event.target.value as BillingType)}
            >
              <option value="hourly">按小时</option>
              <option value="per_session">按次</option>
            </select>
          </div>
          <div>
            <FieldLabel>结算周期</FieldLabel>
            <select
              className={inputClassName()}
              value={form.settlementCycle}
              onChange={(event) => updateField('settlementCycle', event.target.value as SettlementCycle)}
            >
              <option value="per_session">按次</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
              <option value="custom">自定义</option>
            </select>
          </div>
        </div>

        <div>
          <FieldLabel>家长联系方式</FieldLabel>
          <input
            className={inputClassName()}
            value={form.parentContact}
            onChange={(event) => updateField('parentContact', event.target.value)}
            placeholder="手机号或微信"
          />
        </div>

        <div>
          <FieldLabel>备注</FieldLabel>
          <textarea
            className="min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
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

        {error ? <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p> : null}

        <div className="grid grid-cols-2 gap-3">
          <ActionButton onClick={onCancel}>取消</ActionButton>
          <ActionButton variant="primary" type="submit" disabled={!canSave}>
            保存学生
          </ActionButton>
        </div>
      </form>
    </Card>
  );
}

function StudentCard({
  student,
  onEdit,
  onDelete,
}: {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}) {
  const noteSummary = student.note && student.note.length > 26 ? `${student.note.slice(0, 26)}...` : student.note;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">{student.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            {student.grade || '未填写年级'} · {student.subject || '未填写科目'}
          </p>
        </div>
        <span
          className={`rounded-md px-2 py-1 text-xs font-semibold ${
            student.isActive ? 'bg-mint/10 text-mint' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {student.isActive ? '活跃' : '停用'}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">默认单价</dt>
          <dd className="mt-1 font-semibold">¥{student.defaultRate}</dd>
        </div>
        <div>
          <dt className="text-slate-500">默认时长</dt>
          <dd className="mt-1 font-semibold">{student.defaultDuration}小时</dd>
        </div>
        <div>
          <dt className="text-slate-500">计费方式</dt>
          <dd className="mt-1 font-semibold">{billingTypeLabel[student.billingType]}</dd>
        </div>
        <div>
          <dt className="text-slate-500">结算周期</dt>
          <dd className="mt-1 font-semibold">{settlementCycleLabel[student.settlementCycle]}</dd>
        </div>
      </dl>

      {student.parentContact ? (
        <p className="mt-3 text-sm text-slate-500">家长联系方式：{student.parentContact}</p>
      ) : null}
      <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
        {noteSummary || '暂无备注'}
      </p>

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

export function Students() {
  const { students, addStudent, updateStudent, deleteStudent } = useStudents();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  function openCreateForm() {
    setEditingStudent(null);
    setIsFormOpen(true);
  }

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
    } else {
      addStudent(input);
    }

    closeForm();
  }

  function handleDelete(student: Student) {
    const confirmed = window.confirm(`确定删除学生「${student.name}」吗？`);
    if (confirmed) {
      deleteStudent(student.id);
    }
  }

  return (
    <div>
      <PageHeader title="学生" subtitle="管理学生资料、默认收费和结算偏好" />

      {isFormOpen ? (
        <StudentForm
          title={editingStudent ? '编辑学生' : '新增学生'}
          initialValue={editingStudent ? studentToForm(editingStudent) : emptyForm}
          onCancel={closeForm}
          onSave={handleSave}
        />
      ) : (
        <ActionButton variant="primary" className="mb-4 inline-flex w-full items-center justify-center gap-2" onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          新增学生
        </ActionButton>
      )}

      {students.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-500">还没有学生，先添加第一个学生吧。</p>
          <ActionButton variant="primary" className="mt-4 inline-flex items-center gap-2" onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            新增学生
          </ActionButton>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <StudentCard key={student.id} student={student} onEdit={openEditForm} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
