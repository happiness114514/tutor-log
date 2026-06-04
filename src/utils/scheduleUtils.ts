import type { Lesson, Schedule, Student } from '../types';
import type { LessonInput } from '../store/useLessons';
import { formatMoney, isEffectiveLesson } from './dashboardStats';
import { createDeletedStudentSnapshot, createStudentSnapshot, getStudentDisplay } from './studentDisplay';

export type ScheduleInstanceStatus = 'later_today' | 'countdown' | 'in_progress' | 'ended_pending_record' | 'recorded';

export type TodayTodoType = 'ended_unrecorded' | 'in_progress' | 'upcoming' | 'today_course' | 'unsettled';

export type TodayTodo = {
  id: string;
  type: TodayTodoType;
  label: string;
  message: string;
  priority: number;
  statusText?: string;
  isReminderActive?: boolean;
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

const COUNTDOWN_THRESHOLD_MINUTES = 120;
const DEFAULT_APP_REMINDER_MINUTES = 120;

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

function getTimeBounds(schedule: Schedule, date: string) {
  return {
    startAt: createDateTime(date, schedule.startTime, '00:00'),
    endAt: createDateTime(date, schedule.endTime, '23:59'),
  };
}

function getMinutesUntilStart(schedule: Schedule, date: string, now: Date) {
  const { startAt } = getTimeBounds(schedule, date);
  return Math.ceil((startAt.getTime() - now.getTime()) / 60000);
}

export function getScheduleReminderWindow(schedule: Schedule) {
  return schedule.reminderMinutesBefore ?? DEFAULT_APP_REMINDER_MINUTES;
}

export function isWithinReminderWindow(instance: ScheduleInstance, now = new Date()) {
  const reminderWindow = getScheduleReminderWindow(instance.schedule);
  if (reminderWindow <= 0) {
    return false;
  }

  const minutesUntilStart = getMinutesUntilStart(instance.schedule, instance.date, now);
  return minutesUntilStart >= 0 && minutesUntilStart <= reminderWindow;
}

export function formatTimeUntilCourse(minutesUntilStart: number, startTime: string) {
  if (minutesUntilStart > COUNTDOWN_THRESHOLD_MINUTES) {
    return `今天 ${startTime} 上课`;
  }

  if (minutesUntilStart < 60) {
    return `还有 ${Math.max(1, minutesUntilStart)} 分钟上课`;
  }

  const hours = Math.floor(minutesUntilStart / 60);
  const minutes = minutesUntilStart % 60;
  return minutes > 0 ? `还有 ${hours} 小时 ${minutes} 分钟上课` : `还有 ${hours} 小时上课`;
}

function getInstanceStatus(schedule: Schedule, date: string, lessons: Lesson[], now = new Date()): ScheduleInstanceStatus {
  const generatedLesson = findGeneratedLesson(schedule.id, date, lessons);
  if (generatedLesson) {
    return 'recorded';
  }

  const { startAt, endAt } = getTimeBounds(schedule, date);
  if (now > endAt) {
    return 'ended_pending_record';
  }

  if (now >= startAt && now <= endAt) {
    return 'in_progress';
  }

  const minutesUntilStart = getMinutesUntilStart(schedule, date, now);
  return minutesUntilStart <= COUNTDOWN_THRESHOLD_MINUTES ? 'countdown' : 'later_today';
}

export function getCourseTodoDisplayStatus(instance: ScheduleInstance, now = new Date()) {
  if (instance.status === 'recorded') {
    return {
      type: 'today_course' as TodayTodoType,
      label: '已记录',
      text: '已记录',
      priority: 6,
      isReminderActive: false,
    };
  }

  if (instance.status === 'ended_pending_record') {
    return {
      type: 'ended_unrecorded' as TodayTodoType,
      label: '待记录',
      text: '已结束，待记录',
      priority: 1,
      isReminderActive: false,
    };
  }

  if (instance.status === 'in_progress') {
    return {
      type: 'in_progress' as TodayTodoType,
      label: '正在上课',
      text: '正在上课',
      priority: 2,
      isReminderActive: false,
    };
  }

  const minutesUntilStart = getMinutesUntilStart(instance.schedule, instance.date, now);
  const isCountdown = minutesUntilStart <= COUNTDOWN_THRESHOLD_MINUTES;
  const reminderActive = isWithinReminderWindow(instance, now);

  return {
    type: isCountdown ? ('upcoming' as TodayTodoType) : ('today_course' as TodayTodoType),
    label: isCountdown ? '即将上课' : '今天课程',
    text: formatTimeUntilCourse(minutesUntilStart, instance.schedule.startTime),
    priority: isCountdown ? 3 : 4,
    isReminderActive: reminderActive,
  };
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
    subject: schedule.subject || getStudentDisplay(student, schedule).subject,
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

export function createLessonFromSchedule(schedule: Schedule, date: string, student?: Student): LessonInput {
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
    ...(student
      ? createStudentSnapshot(student)
      : createDeletedStudentSnapshot({
          studentNameSnapshot: schedule.studentNameSnapshot,
          studentSubjectSnapshot: schedule.studentSubjectSnapshot || schedule.subject,
          studentGradeSnapshot: schedule.studentGradeSnapshot,
        })),
  };
}

export function getUpcomingScheduleReminders(
  schedules: Schedule[],
  lessons: Lesson[],
  students: Student[],
  now = new Date(),
) {
  return getTodayScheduleInstances(schedules, lessons, students, now).filter((instance) => instance.status === 'countdown');
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
  const summaryMap = new Map<string, { student?: Student; sourceLesson: Lesson; lessonCount: number; amount: number }>();

  lessons
    .filter((lesson) => isEffectiveLesson(lesson) && !lesson.isSettled)
    .forEach((lesson) => {
      const current = summaryMap.get(lesson.studentId) ?? {
        student: studentMap.get(lesson.studentId),
        sourceLesson: lesson,
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
      const studentName = getStudentDisplay(summary.student, summary.sourceLesson).name;

      return {
        id: `unsettled-${studentId}`,
        type: 'unsettled' as const,
        label: '未结算',
        message: `${studentName}有 ${summary.lessonCount} 节课未结算，共 ${formatMoney(summary.amount)}`,
        priority: 5,
        studentId,
      };
    })
    .sort((a, b) => a.message.localeCompare(b.message, 'zh-CN'));
}

export function getTodayTodos(schedules: Schedule[], lessons: Lesson[], students: Student[], now = new Date()) {
  const courseTodos: TodayTodo[] = getTodayScheduleInstances(schedules, lessons, students, now)
    .filter((instance) => instance.status !== 'recorded')
    .map((instance) => {
      const display = getCourseTodoDisplayStatus(instance, now);
      const studentDisplay = getStudentDisplay(instance.student, instance.schedule);

      return {
        id: `course-${instance.id}`,
        type: display.type,
        label: display.label,
        message: `${instance.schedule.startTime}-${instance.schedule.endTime} ${studentDisplay.name} · ${instance.subject}`,
        priority: display.priority,
        statusText: display.text,
        isReminderActive: display.isReminderActive,
        instance,
      };
    });

  return [...courseTodos, ...getUnsettledReminders(students, lessons)].sort(
    (a, b) => a.priority - b.priority || (a.instance?.schedule.startTime ?? '').localeCompare(b.instance?.schedule.startTime ?? ''),
  );
}
