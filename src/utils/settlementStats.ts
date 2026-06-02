import type { Lesson, LessonStatus, Student } from '../types';
import { formatDuration, formatMoney, isEffectiveLesson } from './dashboardStats';

export type SettlementStudentSummary = {
  studentId: string;
  student?: Student;
  studentName: string;
  subject: string;
  lessons: Lesson[];
  lessonCount: number;
  duration: number;
  amount: number;
  latestLessonDate?: string;
};

export type SettlementOverview = {
  amount: number;
  lessonCount: number;
  studentCount: number;
};

const statusLabel: Record<LessonStatus, string> = {
  completed: '已上课',
  cancelled: '取消',
  leave: '请假',
  makeup: '补课',
  trial: '试课',
};

export function isUnsettledEffectiveLesson(lesson: Lesson) {
  return isEffectiveLesson(lesson) && !lesson.isSettled;
}

export function formatLessonTime(lesson: Lesson) {
  if (lesson.startTime && lesson.endTime) {
    return `${lesson.startTime}-${lesson.endTime}`;
  }

  return '';
}

export function formatLessonDateTime(lesson: Lesson) {
  const time = formatLessonTime(lesson);
  return time ? `${lesson.date} ${time}` : lesson.date;
}

export function getLessonStatusLabel(status: LessonStatus) {
  return statusLabel[status];
}

function lessonSortKey(lesson: Lesson) {
  return `${lesson.date || ''} ${lesson.startTime || ''}`;
}

function sortLessonsDesc(lessons: Lesson[]) {
  return [...lessons].sort((a, b) => lessonSortKey(b).localeCompare(lessonSortKey(a)));
}

export function getUnsettledLessonsByStudent(students: Student[], lessons: Lesson[]) {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const grouped = new Map<string, Lesson[]>();

  lessons.filter(isUnsettledEffectiveLesson).forEach((lesson) => {
    grouped.set(lesson.studentId, [...(grouped.get(lesson.studentId) ?? []), lesson]);
  });

  return [...grouped.entries()]
    .map(([studentId, groupLessons]): SettlementStudentSummary => {
      const sortedLessons = sortLessonsDesc(groupLessons);
      const student = studentMap.get(studentId);

      return {
        studentId,
        student,
        studentName: student?.name ?? '未知学生',
        subject: student?.subject ?? '未填写科目',
        lessons: sortedLessons,
        lessonCount: sortedLessons.length,
        duration: sortedLessons.reduce((sum, lesson) => sum + lesson.duration, 0),
        amount: sortedLessons.reduce((sum, lesson) => sum + lesson.amount, 0),
        latestLessonDate: sortedLessons[0]?.date,
      };
    })
    .sort((a, b) => {
      const dateCompare = (b.latestLessonDate ?? '').localeCompare(a.latestLessonDate ?? '');
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return b.amount - a.amount;
    });
}

export function getSettlementOverview(summaries: SettlementStudentSummary[]): SettlementOverview {
  return {
    amount: summaries.reduce((sum, summary) => sum + summary.amount, 0),
    lessonCount: summaries.reduce((sum, summary) => sum + summary.lessonCount, 0),
    studentCount: summaries.length,
  };
}

export function generateSettlementText(summary: SettlementStudentSummary) {
  const lessonLines = summary.lessons
    .map((lesson) => {
      const time = formatLessonTime(lesson);
      const dateAndTime = time ? `${lesson.date} ${time}` : lesson.date;
      return `${dateAndTime} ${summary.subject} ${formatDuration(lesson.duration)} ${formatMoney(lesson.amount)}`;
    })
    .join('\n');

  return [
    `您好，${summary.studentName}的课时明细如下：`,
    '',
    lessonLines,
    '',
    `合计：${summary.lessonCount}次课，${formatDuration(summary.duration)}`,
    `应结算金额：${formatMoney(summary.amount)}`,
    '',
    '您方便时结算即可，谢谢～',
  ].join('\n');
}
