import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { dashboardStats, todayCourse, todos } from '../store/mockData';

const toneClass = {
  mint: 'bg-mint/10 text-mint',
  coral: 'bg-coral/10 text-coral',
  sunshine: 'bg-sunshine/20 text-amber-700',
  blue: 'bg-sky-100 text-sky-700',
};

export function Dashboard() {
  return (
    <div>
      <PageHeader title="家教课时本" subtitle="今天 6月2日 周二" />

      <section className="grid grid-cols-2 gap-3">
        {dashboardStats.map((stat) => (
          <Card key={stat.label} className="p-3">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`mt-2 inline-flex rounded-md px-2 py-1 text-xl font-bold ${toneClass[stat.tone]}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </section>

      <SectionTitle>今日课程</SectionTitle>
      <Card>
        <p className="text-base font-semibold">
          {todayCourse.time} {todayCourse.studentName} {todayCourse.subject}
        </p>
        <p className="mt-2 text-sm text-slate-500">状态：{todayCourse.status}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ActionButton variant="primary">记录课时</ActionButton>
          <ActionButton>请假</ActionButton>
          <ActionButton>取消</ActionButton>
        </div>
      </Card>

      <SectionTitle>待处理事项</SectionTitle>
      <Card>
        <div className="divide-y divide-line">
          {todos.map((todo) => (
            <p key={todo} className="py-3 first:pt-0 last:pb-0 text-sm text-slate-700">
              {todo}
            </p>
          ))}
        </div>
      </Card>

      <SectionTitle>快捷操作</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <ActionButton variant="primary">新增课时</ActionButton>
        <ActionButton>新增学生</ActionButton>
        <ActionButton>新增课程</ActionButton>
      </div>
    </div>
  );
}
