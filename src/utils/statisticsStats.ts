import type { Lesson, LessonStatus, Student } from '../types';
import { formatDuration, formatMoney, isEffectiveLesson } from './dashboardStats';
import { getStudentDisplay } from './studentDisplay';

export type MonthStats = {
  receivable: number;
  received: number;
  unsettled: number;
  duration: number;
  lessonCount: number;
  studentCount: number;
};

export type StudentMonthlyRankingItem = {
  studentId: string;
  name: string;
  subject: string;
  income: number;
  duration: number;
  lessonCount: number;
  unsettledAmount: number;
};

export type StatusDistributionItem = {
  status: LessonStatus;
  label: string;
  count: number;
};

export type RecentMonthTrendItem = {
  year: number;
  month: number;
  label: string;
  receivable: number;
  received: number;
};

export const lessonStatusLabels: Record<LessonStatus, string> = {
  completed: '已上课',
  makeup: '补课',
  trial: '试课',
  leave: '请假',
  cancelled: '取消',
};

export function isLessonInMonth(lesson: Lesson, year: number, month: number) {
  const [lessonYear, lessonMonth] = lesson.date.split('-').map(Number);
  return lessonYear === year && lessonMonth === month;
}

export function getMonthStats(lessons: Lesson[], _students: Student[], year: number, month: number): MonthStats {
  const effectiveLessons = lessons.filter((lesson) => isLessonInMonth(lesson, year, month) && isEffectiveLesson(lesson));
  const studentIds = new Set(effectiveLessons.map((lesson) => lesson.studentId));

  return {
    receivable: effectiveLessons.reduce((sum, lesson) => sum + lesson.amount, 0),
    received: effectiveLessons.filter((lesson) => lesson.isSettled).reduce((sum, lesson) => sum + lesson.amount, 0),
    unsettled: effectiveLessons.filter((lesson) => !lesson.isSettled).reduce((sum, lesson) => sum + lesson.amount, 0),
    duration: effectiveLessons.reduce((sum, lesson) => sum + lesson.duration, 0),
    lessonCount: effectiveLessons.length,
    studentCount: studentIds.size,
  };
}

export function getStudentMonthlyRanking(
  lessons: Lesson[],
  students: Student[],
  year: number,
  month: number,
): StudentMonthlyRankingItem[] {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const grouped = new Map<string, Lesson[]>();

  lessons
    .filter((lesson) => isLessonInMonth(lesson, year, month) && isEffectiveLesson(lesson))
    .forEach((lesson) => {
      grouped.set(lesson.studentId, [...(grouped.get(lesson.studentId) ?? []), lesson]);
    });

  return [...grouped.entries()]
    .map(([studentId, studentLessons]) => {
      const display = getStudentDisplay(studentMap.get(studentId), studentLessons[0]);

      return {
        studentId,
        name: display.name,
        subject: display.subject,
        income: studentLessons.reduce((sum, lesson) => sum + lesson.amount, 0),
        duration: studentLessons.reduce((sum, lesson) => sum + lesson.duration, 0),
        lessonCount: studentLessons.length,
        unsettledAmount: studentLessons
          .filter((lesson) => !lesson.isSettled)
          .reduce((sum, lesson) => sum + lesson.amount, 0),
      };
    })
    .sort((a, b) => {
      const incomeCompare = b.income - a.income;
      if (incomeCompare !== 0) {
        return incomeCompare;
      }

      return b.duration - a.duration;
    });
}

export function getStatusDistribution(lessons: Lesson[], year: number, month: number): StatusDistributionItem[] {
  const monthLessons = lessons.filter((lesson) => isLessonInMonth(lesson, year, month));

  return (Object.keys(lessonStatusLabels) as LessonStatus[])
    .map((status) => ({
      status,
      label: lessonStatusLabels[status],
      count: monthLessons.filter((lesson) => lesson.status === status).length,
    }))
    .filter((item) => item.count > 0);
}

function shiftMonth(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

export function getRecentMonthTrend(
  lessons: Lesson[],
  students: Student[],
  baseYear: number,
  baseMonth: number,
  count = 6,
): RecentMonthTrendItem[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = index - count + 1;
    const target = shiftMonth(baseYear, baseMonth, offset);
    const stats = getMonthStats(lessons, students, target.year, target.month);

    return {
      ...target,
      label: `${target.month}月`,
      receivable: stats.receivable,
      received: stats.received,
    };
  });
}

export function formatChartMoney(amount: number) {
  return formatMoney(amount);
}

export function formatChartDuration(duration: number) {
  return formatDuration(duration);
}

