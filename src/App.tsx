import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Lessons } from './pages/Lessons';
import { Schedule } from './pages/Schedule';
import { Settlement } from './pages/Settlement';
import { Students } from './pages/Students';
import { useActivePage } from './store/useActivePage';

type PendingAction = 'openNewLesson' | 'openNewStudent' | null;

export function App() {
  const [activePage, setActivePage] = useActivePage();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  function openNewLesson() {
    setPendingAction('openNewLesson');
    setActivePage('lessons');
  }

  function openNewStudent() {
    setPendingAction('openNewStudent');
    setActivePage('students');
  }

  const pages = {
    dashboard: (
      <Dashboard
        onCreateLesson={openNewLesson}
        onCreateStudent={openNewStudent}
      />
    ),
    schedule: <Schedule />,
    lessons: (
      <Lessons
        onNavigateToStudents={() => setActivePage('students')}
        openCreateRequest={pendingAction === 'openNewLesson'}
        onCreateRequestConsumed={() => setPendingAction(null)}
      />
    ),
    students: (
      <Students
        openCreateRequest={pendingAction === 'openNewStudent'}
        onCreateRequestConsumed={() => setPendingAction(null)}
      />
    ),
    settlement: <Settlement />,
  };

  return (
    <AppShell
      content={pages[activePage]}
      nav={<BottomNav activePage={activePage} onChange={setActivePage} />}
    />
  );
}
