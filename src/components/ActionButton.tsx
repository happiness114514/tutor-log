import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function ActionButton({ children, variant = 'secondary', className = '', ...props }: ActionButtonProps) {
  const styles =
    variant === 'primary'
      ? 'border-mint bg-mint text-white'
      : 'border-line bg-white text-slate-700';

  return (
    <button
      type="button"
      className={`h-10 rounded-md border px-3 text-sm font-medium ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
