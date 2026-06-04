import type { Lesson, Schedule, Student } from '../types';
import type { AppSettings } from '../types';
import { APP_SETTINGS_STORAGE_KEY, defaultAppSettings, normalizeAppSettings, readAppSettingsFromStorage } from '../store/useAppSettings';
import { hydrateLessonSnapshot, hydrateScheduleSnapshot } from './studentDisplay';

const BACKUP_VERSION = '1.0.0';

const STORAGE_KEYS = {
  students: 'tutor-log.students',
  lessons: 'tutor-log.lessons',
  schedules: 'tutor-log.schedules',
  activePage: 'tutor-log.active-page',
  appSettings: APP_SETTINGS_STORAGE_KEY,
};

type BackupData = {
  students: unknown[];
  lessons: unknown[];
  schedules: unknown[];
  appSettings?: unknown;
};

type BackupFile = {
  appName: 'TutorLog';
  exportedAt: string;
  version: string;
  data: BackupData;
};

function readArrayFromStorage(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function todayFilePart() {
  return new Date().toISOString().slice(0, 10);
}

function assertBackupFile(value: unknown): asserts value is BackupFile {
  if (!value || typeof value !== 'object' || !('data' in value)) {
    throw new Error('Backup data missing');
  }

  const data = (value as { data?: Partial<BackupData> }).data;
  if (!data || !Array.isArray(data.students) || !Array.isArray(data.lessons) || !Array.isArray(data.schedules)) {
    throw new Error('Backup arrays missing');
  }
}

function normalizeBackupData(data: BackupData): BackupData {
  const students = data.students as Student[];

  return {
    ...data,
    lessons: (data.lessons as Lesson[]).map((lesson) => hydrateLessonSnapshot(lesson, students)),
    schedules: (data.schedules as Schedule[]).map((schedule) => hydrateScheduleSnapshot(schedule, students)),
    appSettings: normalizeAppSettings(data.appSettings),
  };
}

export function createBackupFile(settingsOverride?: AppSettings): BackupFile {
  return {
    appName: 'TutorLog',
    exportedAt: new Date().toISOString(),
    version: BACKUP_VERSION,
    data: {
      students: readArrayFromStorage(STORAGE_KEYS.students),
      lessons: readArrayFromStorage(STORAGE_KEYS.lessons),
      schedules: readArrayFromStorage(STORAGE_KEYS.schedules),
      appSettings: settingsOverride ?? readAppSettingsFromStorage(),
    },
  };
}

export function exportLocalData(settingsOverride?: AppSettings) {
  const backup = createBackupFile(settingsOverride);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tutor-log-backup-${todayFilePart()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function parseBackupFile(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  assertBackupFile(parsed);
  return parsed;
}

export function importLocalData(backup: BackupFile) {
  const normalizedData = normalizeBackupData(backup.data);

  window.localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(normalizedData.students));
  window.localStorage.setItem(STORAGE_KEYS.lessons, JSON.stringify(normalizedData.lessons));
  window.localStorage.setItem(STORAGE_KEYS.schedules, JSON.stringify(normalizedData.schedules));
  window.localStorage.setItem(
    STORAGE_KEYS.appSettings,
    JSON.stringify(normalizedData.appSettings ?? defaultAppSettings),
  );
}

export function clearLocalData() {
  window.localStorage.setItem(STORAGE_KEYS.students, JSON.stringify([]));
  window.localStorage.setItem(STORAGE_KEYS.lessons, JSON.stringify([]));
  window.localStorage.setItem(STORAGE_KEYS.schedules, JSON.stringify([]));
  window.localStorage.removeItem(STORAGE_KEYS.appSettings);
  window.localStorage.setItem(STORAGE_KEYS.activePage, JSON.stringify('dashboard'));
}
