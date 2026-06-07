import { useEffect, useMemo, useState } from 'react';
import type { BillingType, SettlementCycle, Student } from '../types';
import { readStorage, writeStorage } from '../utils/storage';

const STORAGE_KEY = 'tutor-log.students';

export type StudentInput = {
  name: string;
  grade?: string;
  subject?: string;
  defaultRate: number;
  defaultDuration: number;
  billingType: BillingType;
  settlementCycle: SettlementCycle;
  parentContact?: string;
  note?: string;
  isActive: boolean;
};

function isStudent(value: unknown): value is Student {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const student = value as Partial<Student>;
  return (
    typeof student.id === 'string' &&
    typeof student.name === 'string' &&
    typeof student.defaultRate === 'number' &&
    typeof student.defaultDuration === 'number' &&
    student.billingType !== undefined &&
    student.settlementCycle !== undefined &&
    typeof student.isActive === 'boolean' &&
    typeof student.createdAt === 'string' &&
    typeof student.updatedAt === 'string'
  );
}

function createStudentId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `student-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>(() => {
    const stored = readStorage<unknown>(STORAGE_KEY, null);
    return Array.isArray(stored) && stored.every(isStudent) ? stored : [];
  });

  useEffect(() => {
    writeStorage(STORAGE_KEY, students);
  }, [students]);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name)),
    [students],
  );

  function addStudent(input: StudentInput) {
    const now = new Date().toISOString();
    const student: Student = {
      ...input,
      id: createStudentId(),
      name: input.name.trim(),
      grade: normalizeText(input.grade),
      subject: normalizeText(input.subject),
      parentContact: normalizeText(input.parentContact),
      note: normalizeText(input.note),
      createdAt: now,
      updatedAt: now,
    };

    setStudents((current) => [student, ...current]);
  }

  function updateStudent(id: string, input: StudentInput) {
    const now = new Date().toISOString();

    setStudents((current) =>
      current.map((student) =>
        student.id === id
          ? {
              ...student,
              ...input,
              name: input.name.trim(),
              grade: normalizeText(input.grade),
              subject: normalizeText(input.subject),
              parentContact: normalizeText(input.parentContact),
              note: normalizeText(input.note),
              updatedAt: now,
            }
          : student,
      ),
    );
  }

  function deleteStudent(id: string) {
    setStudents((current) => current.filter((student) => student.id !== id));
  }

  return {
    students: sortedStudents,
    addStudent,
    updateStudent,
    deleteStudent,
  };
}
