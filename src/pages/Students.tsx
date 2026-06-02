import { Plus } from 'lucide-react';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { students } from '../store/mockData';

export function Students() {
  return (
    <div>
      <PageHeader title="学生" />

      <div className="space-y-3">
        {students.map((student) => (
          <Card key={student.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-ink">{student.name}</p>
                <p className="text-sm text-slate-500">{student.gradeSubject}</p>
              </div>
              <span className="rounded-md bg-mint/10 px-2 py-1 text-sm font-semibold text-mint">
                {student.unsettledAmount}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">默认单价</dt>
                <dd className="mt-1 font-semibold">{student.defaultRate}</dd>
              </div>
              <div>
                <dt className="text-slate-500">上课时长</dt>
                <dd className="mt-1 font-semibold">{student.defaultDuration}</dd>
              </div>
              <div>
                <dt className="text-slate-500">本月课时</dt>
                <dd className="mt-1 font-semibold">{student.monthlyHours}</dd>
              </div>
              <div>
                <dt className="text-slate-500">最近上课</dt>
                <dd className="mt-1 font-semibold">{student.latestLesson ?? '待安排'}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <ActionButton variant="primary" className="inline-flex items-center gap-2 shadow-card">
          <Plus className="h-4 w-4" />
          新增学生
        </ActionButton>
      </div>
    </div>
  );
}
