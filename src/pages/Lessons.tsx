import { Plus } from 'lucide-react';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Tag } from '../components/Tag';
import { lessonRecords } from '../store/mockData';

export function Lessons() {
  return (
    <div>
      <PageHeader title="课时记录" />

      <div className="mb-4 flex flex-wrap gap-2">
        <Tag>全部学生</Tag>
        <Tag active>本月</Tag>
        <Tag>未结算</Tag>
      </div>

      <div className="space-y-3">
        {lessonRecords.map((record) => (
          <Card key={record.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">
                  {record.date} {record.time}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {record.studentName} · {record.subject}
                </p>
              </div>
              <Tag active={record.status === '未结算'}>{record.status}</Tag>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              {record.duration} × {record.rate} = {record.amount}
            </p>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <ActionButton variant="primary" className="inline-flex items-center gap-2 shadow-card">
          <Plus className="h-4 w-4" />
          新增课时
        </ActionButton>
      </div>
    </div>
  );
}
