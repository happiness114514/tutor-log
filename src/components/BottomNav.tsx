import { CalendarDays, GraduationCap, Home, ReceiptText, WalletCards } from 'lucide-react';
import type { ComponentType } from 'react';
import type { PageId } from '../types';

interface NavItem {
  id: PageId;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '首页', icon: Home },
  { id: 'schedule', label: '课程表', icon: CalendarDays },
  { id: 'lessons', label: '记录', icon: ReceiptText },
  { id: 'students', label: '学生', icon: GraduationCap },
  { id: 'settlement', label: '结算', icon: WalletCards },
];

interface BottomNavProps {
  activePage: PageId;
  onChange: (page: PageId) => void;
}

export function BottomNav({ activePage, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid w-full max-w-[430px] grid-cols-5 border-t border-line bg-white px-1 pb-2 pt-2 shadow-[0_-8px_24px_rgba(31,41,51,0.08)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.id === activePage;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`flex h-14 flex-col items-center justify-center gap-1 rounded-md text-xs transition ${
              active ? 'bg-mint/10 font-semibold text-mint' : 'text-slate-500'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
