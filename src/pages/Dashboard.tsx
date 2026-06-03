import { ChevronRight, PlusCircle, UserPlus } from 'lucide-react';
import { useRef } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { useLessons } from '../store/useLessons';
import { useSchedules } from '../store/useSchedules';
import { useStudents } from '../store/useStudents';
import type { Lesson } from '../types';
import { exportLocalData, importLocalData, parseBackupFile } from '../utils/backup';
import {
  formatDuration,
  formatMoney,
  getDashboardStats,
  getRecentLessons,
} from '../utils/dashboardStats';
import {
  createLessonFromSchedule,
  getTodayTodos,
  hasGeneratedLesson,
  type TodayTodo,
} from '../utils/scheduleUtils';
import { getLessonStudentDisplay } from '../utils/studentDisplay';
import { queueToast, showToast } from '../utils/toast';

interface DashboardProps {
  onCreateLesson: () => void;
  onCreateStudent: () => void;
  onNavigateToSettlement: () => void;
}

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

function todoBadgeClassName(type: TodayTodo['type']) {
  if (type === 'ended_unrecorded') {
    return 'bg-amber-50 text-amber-800';
  }

  if (type === 'upcoming') {
    return 'bg-sky-50 text-sky-700';
  }

  return 'bg-orange-50 text-orange-700';
}

export function Dashboard({ onCreateLesson, onCreateStudent, onNavigateToSettlement }: DashboardProps) {
  const { students } = useStudents();
  const { lessons, addLesson } = useLessons();
  const { schedules } = useSchedules();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stats = getDashboardStats(students, lessons);
  const recentLessons = getRecentLessons(lessons);
  const todos = getTodayTodos(schedules, lessons, students);
  const visibleTodos = todos.slice(0, 5);
  const hiddenTodoCount = todos.length - visibleTodos.length;

  const statCards = [
    { label: '本月应收', value: formatMoney(stats.monthlyReceivable) },
    { label: '本月已收', value: formatMoney(stats.monthlyReceived) },
    { label: '当前未结算', value: formatMoney(stats.unsettledAmount) },
    { label: '本月课时', value: formatDuration(stats.monthlyDuration) },
  ];

  function handleExport() {
    exportLocalData();
    showToast('数据已导出');
  }

  async function handleImportFile(file?: File) {
    if (!file) {
      return;
    }

    try {
      const backup = await parseBackupFile(file);
      const confirmed = window.confirm('导入数据会覆盖当前本地数据，确定继续吗？');
      if (!confirmed) {
        return;
      }

      importLocalData(backup);
      queueToast('数据导入成功');
      window.location.reload();
    } catch {
      showToast('导入失败，请检查文件格式。', 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleRecordTodo(todo: TodayTodo) {
    if (todo.type !== 'ended_unrecorded' || !todo.instance) {
      return;
    }

    if (hasGeneratedLesson(todo.instance.schedule.id, todo.instance.date, lessons)) {
      showToast('这节课已经记录过了', 'info');
      return;
    }

    addLesson(createLessonFromSchedule(todo.instance.schedule, todo.instance.date));
    showToast('课时已记录');
  }

  return (
    <div>
      <PageHeader title="家教课时本" subtitle={`专注记录，清晰管理 · ${todayLabel()}`} />

      {students.length === 0 ? (
        <Card className="mb-4">
          <p className="text-sm text-slate-600">先添加学生，开始记录你的家教课时。</p>
          <ActionButton variant="primary" className="mt-4 w-full" onClick={onCreateStudent}>
            新增学生
          </ActionButton>
        </Card>
      ) : null}

      <Card className="p-0">
        <section className="grid grid-cols-2 divide-x divide-y divide-neutral-100 overflow-hidden rounded-2xl">
          {statCards.map((stat) => (
            <div key={stat.label} className="p-4">
              <p className="text-xs text-neutral-500">{stat.label}</p>
              <p className="mt-2 text-xl font-semibold tracking-normal text-neutral-950">{stat.value}</p>
            </div>
          ))}
        </section>
      </Card>

      <SectionTitle>快捷操作</SectionTitle>
      <div className="grid gap-3">
        <button
          type="button"
          onClick={onCreateLesson}
          className="flex items-center gap-3 rounded-2xl border border-neutral-300 bg-white p-4 text-left text-neutral-900 shadow-card transition active:bg-neutral-100"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-white">
            <PlusCircle className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">新增课时</span>
            <span className="mt-1 block text-sm text-neutral-500">快速记录一节课</span>
          </span>
          <ChevronRight className="h-4 w-4 text-neutral-400" />
        </button>
        <button
          type="button"
          onClick={onCreateStudent}
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left text-neutral-900 shadow-card transition active:bg-neutral-100"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
            <UserPlus className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">新增学生</span>
            <span className="mt-1 block text-sm text-neutral-500">添加新的家教学生</span>
          </span>
          <ChevronRight className="h-4 w-4 text-neutral-400" />
        </button>
      </div>

      <SectionTitle>今日待办</SectionTitle>
      <Card>
        {visibleTodos.length === 0 ? (
          <p className="text-sm text-slate-500">今天暂无待办事项。</p>
        ) : (
          <div className="divide-y divide-line">
            {visibleTodos.map((todo) => (
              <div key={todo.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-6 text-slate-700">{todo.message}</p>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${todoBadgeClassName(todo.type)}`}>
                    {todo.label}
                  </span>
                </div>
                {todo.type === 'ended_unrecorded' ? (
                  <ActionButton className="mt-3 w-full" onClick={() => handleRecordTodo(todo)}>
                    记录课时
                  </ActionButton>
                ) : null}
                {todo.type === 'unsettled' ? (
                  <ActionButton className="mt-3 w-full" onClick={onNavigateToSettlement}>
                    去结算
                  </ActionButton>
                ) : null}
              </div>
            ))}
            {hiddenTodoCount > 0 ? (
              <p className="pt-3 text-xs text-slate-500">还有 {hiddenTodoCount} 条待办未展示。</p>
            ) : null}
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
              const studentDisplay = getLessonStudentDisplay(lesson, students);

              return (
                <div key={lesson.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {lesson.date} {timeText(lesson)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {studentDisplay.name} · {studentDisplay.subject}
                      </p>
                    </div>
                    <p className="text-base font-bold text-neutral-950">{formatMoney(lesson.amount)}</p>
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

      <SectionTitle>数据管理</SectionTitle>
      <Card>
        <p className="text-sm text-slate-600">备份或恢复本机保存的学生、课时记录和课程表数据。</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ActionButton variant="primary" onClick={handleExport}>
            导出数据
          </ActionButton>
          <ActionButton onClick={() => fileInputRef.current?.click()}>导入数据</ActionButton>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleImportFile(event.target.files?.[0])}
        />
      </Card>
    </div>
  );
}
