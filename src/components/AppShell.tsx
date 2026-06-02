import type { ReactNode } from 'react';

interface AppShellProps {
  content: ReactNode;
  nav: ReactNode;
}

export function AppShell({ content, nav }: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-200 px-0 text-ink sm:px-6">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-paper shadow-2xl">
        <div className="px-4 pb-28 pt-5">{content}</div>
        {nav}
      </div>
    </main>
  );
}
