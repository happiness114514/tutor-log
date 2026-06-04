import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { AppShell } from './components/AppShell';
import { ToastHost } from './components/ToastHost';
import { Dashboard } from './pages/Dashboard';
import { Lessons } from './pages/Lessons';
import { Schedule } from './pages/Schedule';
import { Settlement } from './pages/Settlement';
import { Statistics } from './pages/Statistics';
import { Students } from './pages/Students';
import { useActivePage } from './store/useActivePage';

type PendingAction = 'openNewLesson' | 'openNewStudent' | null;

export function App() {
  const [activePage, setActivePage] = useActivePage();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [pendingEditLessonId, setPendingEditLessonId] = useState<string | null>(null);

  function openNewLesson() {
    setPendingAction('openNewLesson');
    setPendingEditLessonId(null);
    setActivePage('lessons');
  }

  function openNewStudent() {
    setPendingAction('openNewStudent');
    setActivePage('students');
  }

  function openLessonEditor(lessonId: string) {
    setPendingAction(null);
    setPendingEditLessonId(lessonId);
    setActivePage('lessons');
  }

  function openSettlement() {
    setPendingAction(null);
    setPendingEditLessonId(null);
    setActivePage('settlement');
  }

  function openSchedulePage() {
    setPendingAction(null);
    setPendingEditLessonId(null);
    setActivePage('schedule');
  }

  function openStatistics() {
    setPendingAction(null);
    setPendingEditLessonId(null);
    setActivePage('statistics');
  }

  function openDashboard() {
    setPendingAction(null);
    setPendingEditLessonId(null);
    setActivePage('dashboard');
  }

  const pages = {
    dashboard: (
      <Dashboard
        onCreateLesson={openNewLesson}
        onCreateStudent={openNewStudent}
        onNavigateToSettlement={openSettlement}
        onNavigateToStatistics={openStatistics}
      />
    ),
    schedule: <Schedule onCreateStudent={openNewStudent} onOpenLessonEditor={openLessonEditor} />,
    lessons: (
      <Lessons
        onNavigateToStudents={openNewStudent}
        openCreateRequest={pendingAction === 'openNewLesson'}
        onCreateRequestConsumed={() => setPendingAction(null)}
        openEditLessonId={pendingEditLessonId}
        onEditRequestConsumed={() => setPendingEditLessonId(null)}
      />
    ),
    students: (
      <Students
        openCreateRequest={pendingAction === 'openNewStudent'}
        onCreateRequestConsumed={() => setPendingAction(null)}
        onCreateLesson={openNewLesson}
        onNavigateToSchedule={openSchedulePage}
      />
    ),
    settlement: <Settlement onNavigateToLessons={openNewLesson} />,
    statistics: <Statistics onBack={openDashboard} />,
  };

  return (
    <>
      <AppShell
        content={
          <div key={activePage} className="page-transition">
            {pages[activePage]}
          </div>
        }
        nav={<BottomNav activePage={activePage} onChange={setActivePage} />}
      />
      <ToastHost />
    </>
  );
}
