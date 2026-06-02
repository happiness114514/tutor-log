import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { settlementItems } from '../store/mockData';

export function Settlement() {
  return (
    <div>
      <PageHeader title="结算" />

      <Card className="bg-mint text-white">
        <p className="text-sm text-white/80">当前未结算</p>
        <p className="mt-1 text-3xl font-bold">¥1500</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-white/15 p-3">
            <p className="text-white/75">未结算课次</p>
            <p className="mt-1 font-semibold">5节</p>
          </div>
          <div className="rounded-md bg-white/15 p-3">
            <p className="text-white/75">涉及学生</p>
            <p className="mt-1 font-semibold">3人</p>
          </div>
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
