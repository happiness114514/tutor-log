import type { Lesson, Schedule, Student } from '../types';

export type StudentSnapshot = {
  studentNameSnapshot?: string;
  studentSubjectSnapshot?: string;
  studentGradeSnapshot?: string;
};

export type StudentDisplay = {
  name: string;
  subject: string;
  grade?: string;
  isDeleted: boolean;
};

export function createStudentSnapshot(student?: Student): StudentSnapshot {
  return {
    studentNameSnapshot: student?.name,
    studentSubjectSnapshot: student?.subject,
    studentGradeSnapshot: student?.grade,
  };
}

export function createDeletedStudentSnapshot(source?: StudentSnapshot): Required<StudentSnapshot> {
  return {
    studentNameSnapshot: source?.studentNameSnapshot || '已删除学生',
    studentSubjectSnapshot: source?.studentSubjectSnapshot || '未填写科目',
    studentGradeSnapshot: source?.studentGradeSnapshot || '',
  };
}

export function getStudentDisplay(student: Student | undefined, source?: StudentSnapshot): StudentDisplay {
  if (student) {
    return {
      name: student.name,
      subject: student.subject || '未填写科目',
      grade: student.grade,
      isDeleted: false,
    };
  }

  return {
    name: source?.studentNameSnapshot || '已删除学生',
    subject: source?.studentSubjectSnapshot || '未填写科目',
    grade: source?.studentGradeSnapshot,
    isDeleted: true,
  };
}

export function getLessonStudentDisplay(lesson: Lesson, students: Student[]) {
  return getStudentDisplay(
    students.find((student) => student.id === lesson.studentId),
    lesson,
  );
}

export function getScheduleStudentDisplay(schedule: Schedule, students: Student[]) {
  return getStudentDisplay(
    students.find((student) => student.id === schedule.studentId),
    schedule,
  );
}

export function hydrateLessonSnapshot<T extends Lesson>(lesson: T, students: Student[]): T {
  if (lesson.studentNameSnapshot) {
    return lesson;
  }

  const student = students.find((item) => item.id === lesson.studentId);
  if (!student) {
    return lesson;
  }

  return {
    ...lesson,
    ...createStudentSnapshot(student),
  };
}

export function hydrateScheduleSnapshot<T extends Schedule>(schedule: T, students: Student[]): T {
  if (schedule.studentNameSnapshot) {
    return schedule;
  }

  const student = students.find((item) => item.id === schedule.studentId);
  if (!student) {
    return schedule;
  }

  return {
    ...schedule,
    ...createStudentSnapshot(student),
  };
}
