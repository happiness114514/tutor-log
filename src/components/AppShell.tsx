import type { ReactNode } from 'react';

interface AppShellProps {
  content: ReactNode;
  nav: ReactNode;
}

export function AppShell({ content, nav }: AppShellProps) {
  return (
    <main className="min-h-screen bg-stone-100 px-0 text-ink sm:px-6">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-paper shadow-[0_24px_80px_rgba(23,23,23,0.10)]">
        <div className={`px-4 pt-6 ${nav ? 'pb-32' : 'pb-6'}`}>{content}</div>
        {nav}
      </div>
    </main>
  );
}
