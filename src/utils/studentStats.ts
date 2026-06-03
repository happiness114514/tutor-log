import type { Lesson, Schedule, Student } from '../types';
import { isEffectiveLesson, isLessonInCurrentMonth } from './dashboardStats';

export type StudentStats = {
  totalDuration: number;
  totalIncome: number;
  monthlyDuration: number;
  monthlyReceivable: number;
  settledAmount: number;
  unsettledAmount: number;
  lessonCount: number;
  recentLessonDate?: string;
};

function lessonSortKey(lesson: Lesson) {
  return `${lesson.date || ''} ${lesson.startTime || ''}`;
}

export function sortLessonsDesc(lessons: Lesson[]) {
  return [...lessons].sort((a, b) => lessonSortKey(b).localeCompare(lessonSortKey(a)));
}

export function getStudentLessons(studentId: string, lessons: Lesson[]) {
  return sortLessonsDesc(lessons.filter((lesson) => lesson.studentId === studentId));
}

export function getStudentSchedules(studentId: string, schedules: Schedule[]) {
  return schedules
    .filter((schedule) => schedule.studentId === studentId)
    .sort((a, b) => {
      const statusCompare = Number(b.status === 'active') - Number(a.status === 'active');
      if (statusCompare !== 0) {
        return statusCompare;
      }

      const dateCompare = (a.date ?? '').localeCompare(b.date ?? '');
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return a.startTime.localeCompare(b.startTime);
    });
}

export function getStudentStats(_student: Student, lessons: Lesson[]): StudentStats {
  const effectiveLessons = lessons.filter(isEffectiveLesson);
  const monthlyEffectiveLessons = effectiveLessons.filter((lesson) => isLessonInCurrentMonth(lesson));

  return {
    totalDuration: effectiveLessons.reduce((sum, lesson) => sum + lesson.duration, 0),
    totalIncome: effectiveLessons.reduce((sum, lesson) => sum + lesson.amount, 0),
    monthlyDuration: monthlyEffectiveLessons.reduce((sum, lesson) => sum + lesson.duration, 0),
    monthlyReceivable: monthlyEffectiveLessons.reduce((sum, lesson) => sum + lesson.amount, 0),
    settledAmount: effectiveLessons
      .filter((lesson) => lesson.isSettled)
      .reduce((sum, lesson) => sum + lesson.amount, 0),
    unsettledAmount: effectiveLessons
      .filter((lesson) => !lesson.isSettled)
      .reduce((sum, lesson) => sum + lesson.amount, 0),
    lessonCount: effectiveLessons.length,
    recentLessonDate: sortLessonsDesc(effectiveLessons)[0]?.date,
  };
}

export function getStudentUnsettledLessons(studentId: string, lessons: Lesson[]) {
  return sortLessonsDesc(
    lessons.filter((lesson) => lesson.studentId === studentId && isEffectiveLesson(lesson) && !lesson.isSettled),
  );
}

export function getRecentLessonsByStudent(studentId: string, lessons: Lesson[], limit = 5) {
  return getStudentLessons(studentId, lessons).slice(0, limit);
}

export function getRecentTeachingNotes(studentId: string, lessons: Lesson[], limit = 3) {
  return getStudentLessons(studentId, lessons)
    .filter((lesson) => lesson.content || lesson.homework || lesson.note)
    .slice(0, limit);
}
