import { useEffect, useMemo, useState } from 'react';
import type { BillingType, Lesson, LessonStatus, TrialFeeMode } from '../types';
import { readStorage, writeStorage } from '../utils/storage';

const STORAGE_KEY = 'tutor-log.lessons';

export type LessonInput = {
  studentId: string;
  scheduleId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  rate: number;
  billingType: BillingType;
  amount: number;
  status: LessonStatus;
  trialFeeMode?: TrialFeeMode;
  isSettled: boolean;
  content?: string;
  homework?: string;
  note?: string;
};

function isLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const lesson = value as Partial<Lesson>;
  return (
    typeof lesson.id === 'string' &&
    typeof lesson.studentId === 'string' &&
    typeof lesson.date === 'string' &&
    typeof lesson.duration === 'number' &&
    typeof lesson.rate === 'number' &&
    typeof lesson.amount === 'number' &&
    typeof lesson.billingType === 'string' &&
    typeof lesson.status === 'string' &&
    typeof lesson.isSettled === 'boolean' &&
    typeof lesson.createdAt === 'string' &&
    typeof lesson.updatedAt === 'string'
  );
}

function createLessonId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `lesson-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function calculateLessonAmount({
  duration,
  rate,
  billingType,
  status,
}: {
  duration: number;
  rate: number;
  billingType: BillingType;
  status: LessonStatus;
}) {
  if (status === 'cancelled' || status === 'leave') {
    return 0;
  }

  return billingType === 'hourly' ? Number((duration * rate).toFixed(2)) : rate;
}

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    const stored = readStorage<unknown>(STORAGE_KEY, null);
    return Array.isArray(stored) && stored.every(isLesson) ? stored : [];
  });

  useEffect(() => {
    writeStorage(STORAGE_KEY, lessons);
  }, [lessons]);

  const sortedLessons = useMemo(
    () =>
      [...lessons].sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) {
          return dateCompare;
        }

        return (b.startTime ?? '').localeCompare(a.startTime ?? '');
      }),
    [lessons],
  );

  function addLesson(input: LessonInput) {
    const now = new Date().toISOString();
    const lesson: Lesson = {
      ...input,
      id: createLessonId(),
      startTime: normalizeText(input.startTime),
      endTime: normalizeText(input.endTime),
      content: normalizeText(input.content),
      homework: normalizeText(input.homework),
      note: normalizeText(input.note),
      createdAt: now,
      updatedAt: now,
    };

    setLessons((current) => [lesson, ...current]);
    return lesson;
  }

  function updateLesson(id: string, input: LessonInput) {
    const now = new Date().toISOString();

    setLessons((current) =>
      current.map((lesson) =>
        lesson.id === id
          ? {
              ...lesson,
              ...input,
              startTime: normalizeText(input.startTime),
              endTime: normalizeText(input.endTime),
              content: normalizeText(input.content),
              homework: normalizeText(input.homework),
              note: normalizeText(input.note),
              updatedAt: now,
            }
          : lesson,
      ),
    );
  }

  function deleteLesson(id: string) {
    setLessons((current) => current.filter((lesson) => lesson.id !== id));
  }

  function markLessonsSettled(ids: string[]) {
    const idSet = new Set(ids);
    const now = new Date().toISOString();

    setLessons((current) =>
      current.map((lesson) =>
        idSet.has(lesson.id)
          ? {
              ...lesson,
              isSettled: true,
              updatedAt: now,
            }
          : lesson,
      ),
    );
  }

  return {
    lessons: sortedLessons,
    addLesson,
    updateLesson,
    deleteLesson,
    markLessonsSettled,
  };
}
