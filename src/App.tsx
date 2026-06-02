import type { ReactElement } from 'react';
import { BottomNav } from './components/BottomNav';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Lessons } from './pages/Lessons';
import { Schedule } from './pages/Schedule';
import { Settlement } from './pages/Settlement';
import { Students } from './pages/Students';
import { useActivePage } from './store/useActivePage';
import type { PageId } from './types';

const pages: Record<PageId, ReactElement> = {
  dashboard: <Dashboard />,
  schedule: <Schedule />,
  lessons: <Lessons />,
  students: <Students />,
  settlement: <Settlement />,
};

export function App() {
  const [activePage, setActivePage] = useActivePage();

  return (
    <AppShell
      content={pages[activePage]}
      nav={<BottomNav activePage={activePage} onChange={setActivePage} />}
    />
  );
}
