import { BottomNav } from './components/BottomNav';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Lessons } from './pages/Lessons';
import { Schedule } from './pages/Schedule';
import { Settlement } from './pages/Settlement';
import { Students } from './pages/Students';
import { useActivePage } from './store/useActivePage';

export function App() {
  const [activePage, setActivePage] = useActivePage();

  const pages = {
    dashboard: <Dashboard />,
    schedule: <Schedule />,
    lessons: <Lessons onNavigateToStudents={() => setActivePage('students')} />,
    students: <Students />,
    settlement: <Settlement />,
  };

  return (
    <AppShell
      content={pages[activePage]}
      nav={<BottomNav activePage={activePage} onChange={setActivePage} />}
    />
  );
}
