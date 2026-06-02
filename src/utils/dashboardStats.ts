import type { Lesson, Student } from '../types';

export type DashboardStats = {
  monthlyReceivable: number;
  monthlyReceived: number;
  unsettledAmount: number;
  monthlyDuration: number;
};

export type UnsettledStudentSummary = {
  studentId: string;
  studentName: string;
  lessonCount: number;
  amount: number;
};

export function isEffectiveLesson(lesson: Lesson) {
  if (lesson.status === 'cancelled' || lesson.status === 'leave') {
    return false;
  }

  if (lesson.status === 'trial') {
    return lesson.amount > 0;
  }

  return lesson.status === 'completed' || lesson.status === 'makeup';
}

export function isLessonInCurrentMonth(lesson: Lesson, now = new Date()) {
  const [year, month] = lesson.date.split('-').map(Number);
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

export function formatMoney(amount: number) {
  const normalized = Number(amount.toFixed(2));
  return `¥${normalized}`;
}

export function formatDuration(duration: number) {
  const totalMinutes = Math.round(duration * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}小时${minutes}分钟`;
  }

  if (hours > 0) {
    return `${hours}小时`;
  }

  return `${minutes}分钟`;
}

export function getStudentById(students: Student[], studentId: string) {
  return students.find((student) => student.id === studentId);
}

export function getDashboardStats(_students: Student[], lessons: Lesson[]): DashboardStats {
  const currentMonthEffectiveLessons = lessons.filter(
    (lesson) => isEffectiveLesson(lesson) && isLessonInCurrentMonth(lesson),
  );

  return {
    monthlyReceivable: currentMonthEffectiveLessons.reduce((sum, lesson) => sum + lesson.amount, 0),
    monthlyReceived: currentMonthEffectiveLessons
      .filter((lesson) => lesson.isSettled)
      .reduce((sum, lesson) => sum + lesson.amount, 0),
    unsettledAmount: lessons
      .filter((lesson) => isEffectiveLesson(lesson) && !lesson.isSettled)
      .reduce((sum, lesson) => sum + lesson.amount, 0),
    monthlyDuration: currentMonthEffectiveLessons.reduce((sum, lesson) => sum + lesson.duration, 0),
  };
}

export function getRecentLessons(lessons: Lesson[], limit = 3) {
  return [...lessons]
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return (b.startTime ?? '').localeCompare(a.startTime ?? '');
    })
    .slice(0, limit);
}

export function getUnsettledSummaryByStudent(students: Student[], lessons: Lesson[]) {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const summaryMap = new Map<string, UnsettledStudentSummary>();

  lessons
    .filter((lesson) => isEffectiveLesson(lesson) && !lesson.isSettled)
    .forEach((lesson) => {
      const student = studentMap.get(lesson.studentId);
      const current = summaryMap.get(lesson.studentId) ?? {
        studentId: lesson.studentId,
        studentName: student?.name ?? '未知学生',
        lessonCount: 0,
        amount: 0,
      };

      summaryMap.set(lesson.studentId, {
        ...current,
        lessonCount: current.lessonCount + 1,
        amount: current.amount + lesson.amount,
      });
    });

  return [...summaryMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
}
