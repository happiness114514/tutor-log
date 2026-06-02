import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { settlementItems } from '../store/mockData';

const settlementOverview = [
  { label: '当前未结算', value: '¥1500' },
  { label: '未结算课次', value: '5节' },
  { label: '涉及学生', value: '2人' },
];

export function Settlement() {
  return (
    <div>
      <PageHeader title="结算" />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">结算总览</h2>
          <span className="text-xs text-slate-400">本月</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {settlementOverview.map((item) => (
            <div key={item.label} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-2 text-lg font-bold text-ink">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>学生结算</SectionTitle>
      <div className="space-y-3">
        {settlementItems.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{item.studentName}</p>
                <p className="mt-1 text-sm text-slate-500">最近上课 {item.latestLesson}</p>
              </div>
              <p className="text-xl font-bold text-coral">{item.amount}</p>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              未结算 {item.lessonCount} 节课 · {item.hours}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <ActionButton>查看明细</ActionButton>
              <ActionButton>复制账单</ActionButton>
              <ActionButton variant="primary">标记已收款</ActionButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
