import { useEffect, useMemo, useState } from 'react';
import type { BillingType, Schedule, ScheduleStatus, ScheduleType } from '../types';
import { readStorage, writeStorage } from '../utils/storage';

const STORAGE_KEY = 'tutor-log.schedules';

export type ScheduleInput = {
  studentId: string;
  title?: string;
  subject?: string;
  scheduleType: ScheduleType;
  repeatRule?: {
    frequency: 'weekly';
    weekdays: number[];
  };
  date?: string;
  startTime: string;
  endTime: string;
  location?: string;
  reminderMinutesBefore?: number;
  postClassReminderEnabled: boolean;
  defaultDuration: number;
  defaultRate: number;
  billingType: BillingType;
  status: ScheduleStatus;
  note?: string;
};

function isSchedule(value: unknown): value is Schedule {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const schedule = value as Partial<Schedule>;
  return (
    typeof schedule.id === 'string' &&
    typeof schedule.studentId === 'string' &&
    typeof schedule.scheduleType === 'string' &&
    typeof schedule.startTime === 'string' &&
    typeof schedule.endTime === 'string' &&
    typeof schedule.postClassReminderEnabled === 'boolean' &&
    typeof schedule.defaultDuration === 'number' &&
    typeof schedule.defaultRate === 'number' &&
    typeof schedule.billingType === 'string' &&
    typeof schedule.status === 'string' &&
    typeof schedule.createdAt === 'string' &&
    typeof schedule.updatedAt === 'string'
  );
}

function createScheduleId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `schedule-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeInput(input: ScheduleInput) {
  return {
    ...input,
    title: normalizeText(input.title),
    subject: normalizeText(input.subject),
    location: normalizeText(input.location),
    note: normalizeText(input.note),
    date: input.scheduleType === 'one_time' ? normalizeText(input.date) : undefined,
    repeatRule:
      input.scheduleType === 'recurring'
        ? {
            frequency: 'weekly' as const,
            weekdays: [...(input.repeatRule?.weekdays ?? [])].sort((a, b) => a - b),
          }
        : undefined,
  };
}

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    const stored = readStorage<unknown>(STORAGE_KEY, null);
    return Array.isArray(stored) && stored.every(isSchedule) ? stored : [];
  });

  useEffect(() => {
    writeStorage(STORAGE_KEY, schedules);
  }, [schedules]);

  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort((a, b) => {
        const dateCompare = (a.date ?? '').localeCompare(b.date ?? '');
        if (dateCompare !== 0) {
          return dateCompare;
        }

        return a.startTime.localeCompare(b.startTime);
      }),
    [schedules],
  );

  function addSchedule(input: ScheduleInput) {
    const now = new Date().toISOString();
    const schedule: Schedule = {
      ...normalizeInput(input),
      id: createScheduleId(),
      createdAt: now,
      updatedAt: now,
    };

    setSchedules((current) => [schedule, ...current]);
    return schedule;
  }

  function updateSchedule(id: string, input: ScheduleInput) {
    const now = new Date().toISOString();

    setSchedules((current) =>
      current.map((schedule) =>
        schedule.id === id
          ? {
              ...schedule,
              ...normalizeInput(input),
              updatedAt: now,
            }
          : schedule,
      ),
    );
  }

  function deleteSchedule(id: string) {
    setSchedules((current) => current.filter((schedule) => schedule.id !== id));
  }

  function updateScheduleStatus(id: string, status: ScheduleStatus) {
    const now = new Date().toISOString();

    setSchedules((current) =>
      current.map((schedule) => (schedule.id === id ? { ...schedule, status, updatedAt: now } : schedule)),
    );
  }

  return {
    schedules: sortedSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    updateScheduleStatus,
  };
}
