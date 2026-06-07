import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, ReceiptText, UserPlus, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { ActionButton } from '../components/ActionButton';

type OnboardingProps = {
  onComplete: () => void;
  onSkip: () => void;
};

const steps = [
  {
    icon: BookOpen,
    title: '欢迎使用家教课时本',
    body: '专为个人家教老师设计，帮你管理学生、课程、课时、收入和结算。',
    points: ['个人家教自用', '课时记录', '费用计算', '结算管理'],
  },
  {
    icon: UserPlus,
    title: '第一步：添加学生',
    body: '为每个学生设置科目、默认课时费、默认课程时长和结算周期。之后记录课时时会自动带出这些信息。',
    points: ['学生姓名', '科目', '默认单价', '默认时长', '结算周期'],
  },
  {
    icon: CalendarDays,
    title: '第二步：安排课程',
    body: '你可以添加固定课程或临时课程。首页会根据课程表显示今日待办，提醒你今天有哪些课。',
    points: ['固定课程', '临时课程', '今日待办', 'App 内提前提醒'],
    note: '当前提醒为 App 内提醒，打开 App 时会显示；暂不支持系统通知。',
  },
  {
    icon: ReceiptText,
    title: '第三步：记录课时',
    body: '上完课后快速记录一节课。选择学生后，系统会自动带出时长、单价，并计算本节费用。',
    points: ['快速记录', '自动算课时费', '试课费用', '已结算 / 未结算'],
  },
  {
    icon: WalletCards,
    title: '第四步：结算和备份',
    body: '结算页会按学生汇总未结算课时，你可以一键复制账单给家长。数据保存在本机浏览器中，建议定期导出备份。',
    points: ['未结算汇总', '复制账单', '标记已收款', '导出备份'],
  },
];

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const step = steps[activeIndex];
  const Icon = step.icon;
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === steps.length - 1;

  function goNext() {
    if (isLast) {
      onComplete();
      return;
    }

    setActiveIndex((current) => current + 1);
  }

  return (
    <div className="edit-page-transition -mx-4 -mt-6 flex min-h-screen flex-col bg-paper px-4 pb-6 pt-6">
      <header className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-500">
          {activeIndex + 1} / {steps.length}
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="pressable rounded-full px-3 py-2 text-sm font-medium text-neutral-500 active:bg-neutral-100"
        >
          跳过
        </button>
      </header>

      <main key={activeIndex} className="page-transition flex flex-1 flex-col justify-center py-8">
        <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-800">
            <Icon className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold leading-tight text-neutral-950">{step.title}</h1>
          <p className="mt-4 text-sm leading-7 text-neutral-600">{step.body}</p>

          <div className="mt-6 grid gap-2">
            {step.points.map((point) => (
              <div key={point} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-3">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-800" />
                <span className="text-sm font-medium text-neutral-800">{point}</span>
              </div>
            ))}
          </div>

          {step.note ? (
            <p className="mt-5 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs leading-5 text-neutral-500">
              {step.note}
            </p>
          ) : null}
        </section>

        <div className="mt-6 flex justify-center gap-2">
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={`h-1.5 rounded-full transition-all ${index === activeIndex ? 'w-6 bg-neutral-800' : 'w-1.5 bg-neutral-300'}`}
            />
          ))}
        </div>
      </main>

      <footer className="grid grid-cols-2 gap-3">
        <ActionButton
          className="inline-flex items-center justify-center gap-2"
          onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
          disabled={isFirst}
        >
          <ChevronLeft className="h-4 w-4" />
          上一步
        </ActionButton>
        <ActionButton variant="primary" className="inline-flex items-center justify-center gap-2" onClick={goNext}>
          {isLast ? '开始使用' : '下一步'}
          {!isLast ? <ChevronRight className="h-4 w-4" /> : null}
        </ActionButton>
      </footer>
    </div>
  );
}
