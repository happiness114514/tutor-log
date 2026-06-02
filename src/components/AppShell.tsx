import type { ReactNode } from 'react';

interface AppShellProps {
  content: ReactNode;
  nav: ReactNode;
}

export function AppShell({ content, nav }: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-200 px-0 text-ink sm:px-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-paper shadow-2xl">
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-5">{content}</div>
        {nav}
      </div>
    </main>
  );
}
