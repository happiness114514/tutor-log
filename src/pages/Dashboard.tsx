import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { useLessons } from '../store/useLessons';
import { useStudents } from '../store/useStudents';
import type { Lesson } from '../types';
import {
  formatDuration,
  formatMoney,
  getDashboardStats,
  getRecentLessons,
  getStudentById,
  getUnsettledSummaryByStudent,
} from '../utils/dashboardStats';

interface DashboardProps {
  onCreateLesson: () => void;
  onCreateStudent: () => void;
}

const toneClass = {
  mint: 'bg-mint/10 text-mint',
  coral: 'bg-coral/10 text-coral',
  sunshine: 'bg-sunshine/20 text-amber-700',
  blue: 'bg-sky-100 text-sky-700',
};

function todayLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());
}

function timeText(lesson: Lesson) {
  if (lesson.startTime && lesson.endTime) {
    return `${lesson.startTime}-${lesson.endTime}`;
  }

  return '未填写时间';
}

export function Dashboard({ onCreateLesson, onCreateStudent }: DashboardProps) {
  const { students } = useStudents();
  const { lessons } = useLessons();
  const stats = getDashboardStats(students, lessons);
  const recentLessons = getRecentLessons(lessons);
  const unsettledSummary = getUnsettledSummaryByStudent(students, lessons);

  const statCards = [
    { label: '本月应收', value: formatMoney(stats.monthlyReceivable), tone: 'mint' as const },
    { label: '本月已收', value: formatMoney(stats.monthlyReceived), tone: 'blue' as const },
    { label: '当前未结算', value: formatMoney(stats.unsettledAmount), tone: 'coral' as const },
    { label: '本月课时', value: formatDuration(stats.monthlyDuration), tone: 'sunshine' as const },
  ];

  return (
    <div>
      <PageHeader title="家教课时本" subtitle={`今天 ${todayLabel()}`} />

      {students.length === 0 ? (
        <Card className="mb-4">
          <p className="text-sm text-slate-600">先添加学生，开始记录你的家教课时。</p>
          <ActionButton variant="primary" className="mt-4 w-full" onClick={onCreateStudent}>
            新增学生
          </ActionButton>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-3">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`mt-2 inline-flex rounded-md px-2 py-1 text-lg font-bold ${toneClass[stat.tone]}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </section>

      <SectionTitle>快捷操作</SectionTitle>
      <div className="grid gap-3">
        <button
          type="button"
          onClick={onCreateLesson}
          className="rounded-lg border border-mint bg-mint p-4 text-left text-white shadow-card"
        >
          <p className="text-base font-semibold">新增课时</p>
          <p className="mt-1 text-sm text-white/80">快速记录一节课</p>
        </button>
        <button
          type="button"
          onClick={onCreateStudent}
          className="rounded-lg border border-line bg-white p-4 text-left text-ink shadow-card"
        >
          <p className="text-base font-semibold">新增学生</p>
          <p className="mt-1 text-sm text-slate-500">添加新的家教学生</p>
        </button>
      </div>

      <SectionTitle>待处理</SectionTitle>
      <Card>
        {unsettledSummary.length === 0 ? (
          <p className="text-sm text-slate-500">暂无待处理事项。</p>
        ) : (
          <div className="divide-y divide-line">
            {unsettledSummary.map((summary) => (
              <p key={summary.studentId} className="py-3 first:pt-0 last:pb-0 text-sm text-slate-700">
                {summary.studentName}有 {summary.lessonCount} 节课未结算，共 {formatMoney(summary.amount)}
              </p>
            ))}
          </div>
        )}
      </Card>

      <SectionTitle>最近记录</SectionTitle>
      <Card>
        {recentLessons.length === 0 ? (
          <p className="text-sm text-slate-500">还没有课时记录，记录第一节课后这里会显示最近记录。</p>
        ) : (
          <div className="divide-y divide-line">
            {recentLessons.map((lesson) => {
              const student = getStudentById(students, lesson.studentId);

              return (
                <div key={lesson.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {lesson.date} {timeText(lesson)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {student?.name ?? '未知学生'} · {student?.subject ?? '未填写科目'}
                      </p>
                    </div>
                    <p className="text-base font-bold text-coral">{formatMoney(lesson.amount)}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDuration(lesson.duration)} · {lesson.isSettled ? '已结算' : '未结算'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
