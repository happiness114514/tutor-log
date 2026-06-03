import type { Lesson, Schedule, Student } from '../types';
import type { LessonInput } from '../store/useLessons';

export type ScheduleInstanceStatus = 'pending' | 'ended_pending_record' | 'recorded';

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

function getInstanceStatus(schedule: Schedule, date: string, lessons: Lesson[], now = new Date()): ScheduleInstanceStatus {
  const generatedLesson = findGeneratedLesson(schedule.id, date, lessons);
  if (generatedLesson) {
    return 'recorded';
  }

  const endAt = new Date(`${date}T${schedule.endTime || '23:59'}:00`);
  return now > endAt ? 'ended_pending_record' : 'pending';
}

function createInstance(schedule: Schedule, date: string, lessons: Lesson[], student?: Student): ScheduleInstance {
  return {
    id: `${schedule.id}-${date}`,
    schedule,
    date,
    student,
    subject: schedule.subject || student?.subject || '未填写科目',
    generatedLesson: findGeneratedLesson(schedule.id, date, lessons),
    status: getInstanceStatus(schedule, date, lessons),
  };
}

export function getTodayScheduleInstances(schedules: Schedule[], lessons: Lesson[], students: Student[]) {
  const today = getTodayDate();
  const weekday = getWeekday(today);
  const studentMap = new Map(students.map((student) => [student.id, student]));

  return schedules
    .filter((schedule) => {
      if (schedule.scheduleType === 'one_time') {
        return schedule.date === today && schedule.status === 'active';
      }

      return schedule.status === 'active' && Boolean(schedule.repeatRule?.weekdays.includes(weekday));
    })
    .map((schedule) => createInstance(schedule, today, lessons, studentMap.get(schedule.studentId)))
    .sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
}

export function getWeekScheduleInstances(schedules: Schedule[], lessons: Lesson[], students: Student[]) {
  const week = getWeekRange();
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const instances: ScheduleInstance[] = [];

  schedules.forEach((schedule) => {
    if (schedule.scheduleType === 'one_time') {
      if (schedule.status === 'active' && schedule.date && schedule.date >= week.start && schedule.date <= week.end) {
        instances.push(createInstance(schedule, schedule.date, lessons, studentMap.get(schedule.studentId)));
      }
      return;
    }

    if (schedule.status !== 'active') {
      return;
    }

    week.dates.forEach((date) => {
      if (schedule.repeatRule?.weekdays.includes(getWeekday(date))) {
        instances.push(createInstance(schedule, date, lessons, studentMap.get(schedule.studentId)));
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
