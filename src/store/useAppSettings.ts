import { useEffect, useState } from 'react';
import type { AppSettings } from '../types';
import { readStorage, writeStorage } from '../utils/storage';

export const APP_SETTINGS_STORAGE_KEY = 'tutor-log.app-settings';

export const defaultAppSettings: AppSettings = {
  defaultReminderMinutesBefore: 30,
  defaultSettlementCycle: 'monthly',
  defaultDuration: 2,
  updatedAt: new Date(0).toISOString(),
};

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') {
    return defaultAppSettings;
  }

  const settings = value as Partial<AppSettings>;
  const defaultReminderMinutesBefore =
    typeof settings.defaultReminderMinutesBefore === 'number' ? settings.defaultReminderMinutesBefore : 30;
  const defaultSettlementCycle =
    settings.defaultSettlementCycle === 'per_session' ||
    settings.defaultSettlementCycle === 'weekly' ||
    settings.defaultSettlementCycle === 'monthly' ||
    settings.defaultSettlementCycle === 'custom'
      ? settings.defaultSettlementCycle
      : 'monthly';
  const defaultDuration = typeof settings.defaultDuration === 'number' && settings.defaultDuration > 0 ? settings.defaultDuration : 2;

  return {
    defaultReminderMinutesBefore,
    defaultSettlementCycle,
    defaultDuration,
    lastExportedAt: typeof settings.lastExportedAt === 'string' ? settings.lastExportedAt : undefined,
    updatedAt: typeof settings.updatedAt === 'string' ? settings.updatedAt : new Date().toISOString(),
  };
}

export function readAppSettingsFromStorage() {
  return normalizeAppSettings(readStorage<unknown>(APP_SETTINGS_STORAGE_KEY, defaultAppSettings));
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(readAppSettingsFromStorage);

  useEffect(() => {
    writeStorage(APP_SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

  function updateSettings(input: Partial<Omit<AppSettings, 'updatedAt'>>) {
    setSettings((current) => ({
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    }));
  }

  function markExportedAt(exportedAt: string) {
    const nextSettings = {
      ...settings,
      lastExportedAt: exportedAt,
      updatedAt: exportedAt,
    };

    setSettings(nextSettings);
    writeStorage(APP_SETTINGS_STORAGE_KEY, nextSettings);
    return nextSettings;
  }

  return {
    settings,
    updateSettings,
    markExportedAt,
  };
}
