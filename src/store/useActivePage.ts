import { useEffect, useState } from 'react';
import type { PageId } from '../types';
import { readStorage, writeStorage } from '../utils/storage';

const STORAGE_KEY = 'tutor-log.active-page';
const pageIds: PageId[] = ['dashboard', 'schedule', 'lessons', 'students', 'settlement', 'statistics', 'settings'];

function isPageId(value: unknown): value is PageId {
  return typeof value === 'string' && pageIds.includes(value as PageId);
}

export function useActivePage() {
  const [activePage, setActivePage] = useState<PageId>(() => {
    const stored = readStorage<unknown>(STORAGE_KEY, 'dashboard');
    return isPageId(stored) ? stored : 'dashboard';
  });

  useEffect(() => {
    writeStorage(STORAGE_KEY, activePage);
  }, [activePage]);

  return [activePage, setActivePage] as const;
}
