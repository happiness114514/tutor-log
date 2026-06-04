import { BarChart3, ChevronRight, PlusCircle, Settings as SettingsIcon, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { Portal, useBodyScrollLock } from '../components/Portal';
import { SectionTitle } from '../components/SectionTitle';
import { useLessons } from '../store/useLessons';
import { useSchedules } from '../store/useSchedules';
import { useStudents } from '../store/useStudents';
import type { Lesson } from '../types';
import {
  formatDuration,
  formatMoney,
  getDashboardStats,
  getRecentLessons,
} from '../utils/dashboardStats';
import {
  calculateDuration,
  createLessonFromSchedule,
  getCourseTodoDisplayStatus,
  getScheduleReminderWindow,
  getTodayTodos,
  hasGeneratedLesson,
  type ScheduleInstance,
  type TodayTodo,
} from '../utils/scheduleUtils';
import { getLessonStudentDisplay, getStudentDisplay } from '../utils/studentDisplay';
import { showToast } from '../utils/toast';

interface DashboardProps {
  onCreateLesson: () => void;
  onCreateStudent: () => void;
  onNavigateToSettlement: () => void;
  onNavigateToStatistics: () => void;
  onOpenSettings: () => void;
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

function todoBadgeClassName(todo: TodayTodo) {
  if (todo.type === 'ended_unrecorded') {
    return 'bg-amber-50 text-amber-800';
  }

  if (todo.type === 'in_progress') {
    return 'bg-neutral-900 text-white';
  }

  if (todo.isReminderActive) {
    return 'bg-stone-100 text-stone-800';
  }

  if (todo.type === 'upcoming' || todo.type === 'today_course') {
    return 'bg-neutral-100 text-neutral-700';
  }

  return 'bg-orange-50 text-orange-700';
}

function billingTypeLabel(type: string) {
  return type === 'per_session' ? '按次' : '按小时';
}

function scheduleTypeLabel(type: string) {
  return type === 'recurring' ? '固定课程' : '临时课程';
}

function reminderText(instance: ScheduleInstance) {
  const reminder = getScheduleReminderWindow(instance.schedule);

  if (instance.schedule.reminderMinutesBefore === undefined) {
    return 'App内默认提前 120 分钟提醒';
  }

  if (reminder <= 0) {
    return '未开启 App 内提前提醒';
  }

  return `App内提前 ${reminder} 分钟提醒`;
}

function CourseDetailDialog({
  todo,
  lessons,
  onClose,
  onRecord,
}: {
  todo: TodayTodo | null;
  lessons: Lesson[];
  onClose: () => void;
  onRecord: (instance: ScheduleInstance) => void;
}) {
  useBodyScrollLock(Boolean(todo?.instance));

  if (!todo?.instance) {
    return null;
  }

  const instance = todo.instance;
  const { schedule, student } = instance;
  const studentDisplay = getStudentDisplay(student, schedule);
  const displayStatus = getCourseTodoDisplayStatus(instance);
  const isRecorded = hasGeneratedLesson(schedule.id, instance.date, lessons);
  const duration = calculateDuration(schedule.startTime, schedule.endTime) || schedule.defaultDuration;
  const subject = schedule.subject || student?.subject || schedule.studentSubjectSnapshot || studentDisplay.subject || '未填写科目';

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/25 px-4 backdrop-blur-[2px] dialog-backdrop">
        <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} aria-label="关闭课程详情" />
        <section className="relative max-h-[86vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl dialog-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-neutral-500">课程详情</p>
              <h2 className="mt-1 text-xl font-semibold text-neutral-950">
                {studentDisplay.name} · {subject}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="pressable inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 active:bg-neutral-100"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-900">{displayStatus.text}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {instance.date} · {schedule.startTime}-{schedule.endTime} · {formatDuration(duration)}
            </p>
          </div>

          <dl className="mt-4 grid gap-3 text-sm">
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <dt className="text-neutral-500">课程类型</dt>
              <dd className="font-medium text-neutral-800">{scheduleTypeLabel(schedule.scheduleType)}</dd>
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <dt className="text-neutral-500">地点</dt>
              <dd className="font-medium text-neutral-800">{schedule.location || '未填写地点'}</dd>
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <dt className="text-neutral-500">App内提醒</dt>
              <dd className="font-medium text-neutral-800">{reminderText(instance)}</dd>
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <dt className="text-neutral-500">默认收费</dt>
              <dd className="font-medium text-neutral-800">
                {formatDuration(schedule.defaultDuration)} · {formatMoney(schedule.defaultRate)} · {billingTypeLabel(schedule.billingType)}
              </dd>
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <dt className="text-neutral-500">家长联系方式</dt>
              <dd className="font-medium text-neutral-800">{student?.parentContact || '未填写联系方式'}</dd>
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <dt className="text-neutral-500">课程备注</dt>
              <dd className="font-medium text-neutral-800">{schedule.note || '无课程备注'}</dd>
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <dt className="text-neutral-500">学生备注</dt>
              <dd className="font-medium text-neutral-800">{student?.note || '无学生备注'}</dd>
            </div>
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <ActionButton onClick={onClose}>关闭</ActionButton>
            {isRecorded ? (
              <ActionButton disabled className="opacity-60">
                已记录
              </ActionButton>
            ) : (
              <ActionButton
                variant={instance.status === 'ended_pending_record' ? 'primary' : 'secondary'}
                onClick={() => onRecord(instance)}
              >
                记录课时
              </ActionButton>
            )}
          </div>
        </section>
      </div>
    </Portal>
  );
}

export function Dashboard({
  onCreateLesson,
  onCreateStudent,
  onNavigateToSettlement,
  onNavigateToStatistics,
  onOpenSettings,
}: DashboardProps) {
  const { students } = useStudents();
  const { lessons, addLesson } = useLessons();
  const { schedules } = useSchedules();
  const [selectedTodo, setSelectedTodo] = useState<TodayTodo | null>(null);
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

  function handleRecordCourse(instance: ScheduleInstance) {
    if (hasGeneratedLesson(instance.schedule.id, instance.date, lessons)) {
      showToast('这节课已经记录过了', 'info');
      setSelectedTodo(null);
      return;
    }

    addLesson(createLessonFromSchedule(instance.schedule, instance.date, instance.student));
    showToast('课时已记录');
    setSelectedTodo(null);
  }

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[26px] font-semibold tracking-normal text-neutral-900">家教课时本</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">{`专注记录，清晰管理 · ${todayLabel()}`}</p>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm active:bg-neutral-100"
          aria-label="打开设置"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </header>
      <CourseDetailDialog todo={selectedTodo} lessons={lessons} onClose={() => setSelectedTodo(null)} onRecord={handleRecordCourse} />

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
        <button
          type="button"
          onClick={onNavigateToStatistics}
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left text-neutral-900 shadow-card transition active:bg-neutral-100"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">数据统计</span>
            <span className="mt-1 block text-sm text-neutral-500">查看收入和课时趋势</span>
          </span>
          <ChevronRight className="h-4 w-4 text-neutral-400" />
        </button>
      </div>

      <SectionTitle>今日待办</SectionTitle>
      <Card>
        {visibleTodos.length === 0 ? (
          <p className="text-sm text-slate-500">今天没有课程安排，也暂无待处理事项。</p>
        ) : (
          <div className="divide-y divide-line">
            {visibleTodos.map((todo) => {
              const isCourseTodo = Boolean(todo.instance);

              return (
                <div key={todo.id} className="py-3 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    className={`w-full text-left ${isCourseTodo ? 'rounded-2xl transition active:bg-neutral-50' : ''}`}
                    onClick={() => (isCourseTodo ? setSelectedTodo(todo) : undefined)}
                    disabled={!isCourseTodo}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-6 text-slate-800">{todo.message}</p>
                        {todo.statusText ? <p className="mt-1 text-xs text-neutral-500">{todo.statusText}</p> : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${todoBadgeClassName(todo)}`}>
                          {todo.label}
                        </span>
                        {todo.isReminderActive ? (
                          <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">提醒中</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                  {isCourseTodo ? (
                    <ActionButton
                      className="mt-3 w-full"
                      variant={todo.type === 'ended_unrecorded' ? 'primary' : 'secondary'}
                      onClick={() => todo.instance && handleRecordCourse(todo.instance)}
                    >
                      记录课时
                    </ActionButton>
                  ) : null}
                  {todo.type === 'unsettled' ? (
                    <ActionButton className="mt-3 w-full" onClick={onNavigateToSettlement}>
                      去结算
                    </ActionButton>
                  ) : null}
                </div>
              );
            })}
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
    </div>
  );
}
