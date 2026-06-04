import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function ActionButton({ children, variant = 'secondary', className = '', ...props }: ActionButtonProps) {
  const styles =
    variant === 'primary'
      ? 'border-neutral-800 bg-neutral-800 text-white shadow-sm active:bg-neutral-700'
      : 'border-neutral-200 bg-white text-neutral-700 active:bg-neutral-100';

  return (
    <button
      type="button"
      className={`pressable h-10 rounded-xl border px-3 text-sm font-medium ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
