import type { Lesson, Schedule, Student } from '../types';
import type { LessonInput } from '../store/useLessons';
import { formatMoney, isEffectiveLesson } from './dashboardStats';

export type ScheduleInstanceStatus = 'pending' | 'upcoming' | 'ended_pending_record' | 'recorded';

export type TodayTodoType = 'ended_unrecorded' | 'upcoming' | 'unsettled';

export type TodayTodo = {
  id: string;
  type: TodayTodoType;
  label: string;
  message: string;
  priority: number;
  instance?: ScheduleInstance;
  studentId?: string;
};

export type ScheduleInstance = {
  id: string;
  schedule: Schedule;
  date: string;
  student?: Student;
  subject: string;
  generatedLesson?: Lesson;
  status: ScheduleInstanceStatus;
};

const weekdayLabel: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
};

const UPCOMING_REMINDER_MINUTES = 120;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

export function getTodayDate() {
  return formatDate(new Date());
}

export function getWeekday(date: string | Date) {
  const day = (typeof date === 'string' ? parseDate(date) : date).getDay();
  return day === 0 ? 7 : day;
}

export function formatWeekday(weekday: number) {
  return weekdayLabel[weekday] ?? `周${weekday}`;
}

export function getWeekRange(date = new Date()) {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  const weekday = getWeekday(current);
  const start = new Date(current);
  start.setDate(current.getDate() - weekday + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: formatDate(start),
    end: formatDate(end),
    dates: Array.from({ length: 7 }, (_, index) => {
      const item = new Date(start);
      item.setDate(start.getDate() + index);
      return formatDate(item);
    }),
  };
}

export function formatMonthDay(date: string) {
  const parsed = parseDate(date);
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
}

export function calculateEndTime(startTime: string, duration: number) {
  if (!startTime || Number.isNaN(duration) || duration <= 0) {
    return '';
  }

  const [hours, minutes] = startTime.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return '';
  }

  const totalMinutes = hours * 60 + minutes + Math.round(duration * 60);
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

export function calculateDuration(startTime: string, endTime: string) {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  if ([startHours, startMinutes, endHours, endMinutes].some(Number.isNaN)) {
    return 0;
  }

  const diff = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  return diff > 0 ? Number((diff / 60).toFixed(2)) : 0;
}

export function hasGeneratedLesson(scheduleId: string, date: string, lessons: Lesson[]) {
  return lessons.some((lesson) => lesson.scheduleId === scheduleId && lesson.date === date);
}

function findGeneratedLesson(scheduleId: string, date: string, lessons: Lesson[]) {
  return lessons.find((lesson) => lesson.scheduleId === scheduleId && lesson.date === date);
}

function createDateTime(date: string, time: string, fallbackTime: string) {
  return new Date(`${date}T${time || fallbackTime}:00`);
}

function getInstanceStatus(schedule: Schedule, date: string, lessons: Lesson[], now = new Date()): ScheduleInstanceStatus {
  const generatedLesson = findGeneratedLesson(schedule.id, date, lessons);
  if (generatedLesson) {
    return 'recorded';
  }

  const startAt = createDateTime(date, schedule.startTime, '00:00');
  const endAt = createDateTime(date, schedule.endTime, '23:59');
  if (now > endAt) {
    return 'ended_pending_record';
  }

  const minutesUntilStart = (startAt.getTime() - now.getTime()) / 60000;
  if (minutesUntilStart >= 0 && minutesUntilStart <= UPCOMING_REMINDER_MINUTES) {
    return 'upcoming';
  }

  return 'pending';
}

function createInstance(
  schedule: Schedule,
  date: string,
  lessons: Lesson[],
  student?: Student,
  now = new Date(),
): ScheduleInstance {
  return {
    id: `${schedule.id}-${date}`,
    schedule,
    date,
    student,
    subject: schedule.subject || student?.subject || '未填写科目',
    generatedLesson: findGeneratedLesson(schedule.id, date, lessons),
    status: getInstanceStatus(schedule, date, lessons, now),
  };
}

export function getTodayScheduleInstances(schedules: Schedule[], lessons: Lesson[], students: Student[], now = new Date()) {
  const today = formatDate(now);
  const weekday = getWeekday(today);
  const studentMap = new Map(students.map((student) => [student.id, student]));

  return schedules
    .filter((schedule) => {
      if (schedule.scheduleType === 'one_time') {
        return schedule.date === today && schedule.status === 'active';
      }

      return schedule.status === 'active' && Boolean(schedule.repeatRule?.weekdays.includes(weekday));
    })
    .map((schedule) => createInstance(schedule, today, lessons, studentMap.get(schedule.studentId), now))
    .sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
}

export function getWeekScheduleInstances(schedules: Schedule[], lessons: Lesson[], students: Student[], now = new Date()) {
  const week = getWeekRange(now);
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const instances: ScheduleInstance[] = [];

  schedules.forEach((schedule) => {
    if (schedule.scheduleType === 'one_time') {
      if (schedule.status === 'active' && schedule.date && schedule.date >= week.start && schedule.date <= week.end) {
        instances.push(createInstance(schedule, schedule.date, lessons, studentMap.get(schedule.studentId), now));
      }
      return;
    }

    if (schedule.status !== 'active') {
      return;
    }

    week.dates.forEach((date) => {
      if (schedule.repeatRule?.weekdays.includes(getWeekday(date))) {
        instances.push(createInstance(schedule, date, lessons, studentMap.get(schedule.studentId), now));
      }
    });
  });

  return instances.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return a.schedule.startTime.localeCompare(b.schedule.startTime);
  });
}

export function groupScheduleInstancesByDate(instances: ScheduleInstance[]) {
  return instances.reduce<Record<string, ScheduleInstance[]>>((groups, instance) => {
    groups[instance.date] = [...(groups[instance.date] ?? []), instance];
    return groups;
  }, {});
}

export function createLessonFromSchedule(schedule: Schedule, date: string): LessonInput {
  const amount =
    schedule.billingType === 'hourly'
      ? Number((schedule.defaultDuration * schedule.defaultRate).toFixed(2))
      : schedule.defaultRate;

  return {
    studentId: schedule.studentId,
    scheduleId: schedule.id,
    date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    duration: schedule.defaultDuration,
    rate: schedule.defaultRate,
    billingType: schedule.billingType,
    amount,
    status: 'completed',
    isSettled: false,
  };
}

export function getUpcomingScheduleReminders(
  schedules: Schedule[],
  lessons: Lesson[],
  students: Student[],
  now = new Date(),
) {
  return getTodayScheduleInstances(schedules, lessons, students, now).filter((instance) => instance.status === 'upcoming');
}

export function getEndedUnrecordedScheduleReminders(
  schedules: Schedule[],
  lessons: Lesson[],
  students: Student[],
  now = new Date(),
) {
  return getTodayScheduleInstances(schedules, lessons, students, now).filter(
    (instance) => instance.status === 'ended_pending_record',
  );
}

export function getUnsettledReminders(students: Student[], lessons: Lesson[]): TodayTodo[] {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const summaryMap = new Map<string, { student?: Student; lessonCount: number; amount: number }>();

  lessons
    .filter((lesson) => isEffectiveLesson(lesson) && !lesson.isSettled)
    .forEach((lesson) => {
      const current = summaryMap.get(lesson.studentId) ?? {
        student: studentMap.get(lesson.studentId),
        lessonCount: 0,
        amount: 0,
      };

      summaryMap.set(lesson.studentId, {
        ...current,
        lessonCount: current.lessonCount + 1,
        amount: current.amount + lesson.amount,
      });
    });

  return [...summaryMap.entries()]
    .map(([studentId, summary]) => {
      const studentName = summary.student?.name ?? '未知学生';

      return {
        id: `unsettled-${studentId}`,
        type: 'unsettled' as const,
        label: '未结算',
        message: `${studentName}有 ${summary.lessonCount} 节课未结算，共 ${formatMoney(summary.amount)}`,
        priority: 3,
        studentId,
      };
    })
    .sort((a, b) => a.message.localeCompare(b.message, 'zh-CN'));
}

export function getTodayTodos(schedules: Schedule[], lessons: Lesson[], students: Student[], now = new Date()) {
  const endedTodos: TodayTodo[] = getEndedUnrecordedScheduleReminders(schedules, lessons, students, now).map(
    (instance) => ({
      id: `ended-${instance.id}`,
      type: 'ended_unrecorded',
      label: '待记录',
      message: `${instance.student?.name ?? '未知学生'} · ${instance.subject}课程已结束，记得记录课时`,
      priority: 1,
      instance,
    }),
  );

  const upcomingTodos: TodayTodo[] = getUpcomingScheduleReminders(schedules, lessons, students, now).map((instance) => ({
    id: `upcoming-${instance.id}`,
    type: 'upcoming',
    label: '即将上课',
    message: `${instance.schedule.startTime} ${instance.student?.name ?? '未知学生'} · ${instance.subject}即将上课`,
    priority: 2,
    instance,
  }));

  return [...endedTodos, ...upcomingTodos, ...getUnsettledReminders(students, lessons)].sort(
    (a, b) => a.priority - b.priority,
  );
}
