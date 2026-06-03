import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <section className={`rounded-2xl border border-neutral-200/80 bg-white/95 p-4 shadow-card ${className}`}>
      {children}
    </section>
  );
}
