interface TagProps {
  children: string;
  active?: boolean;
}

export function Tag({ children, active = false }: TagProps) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-md border px-3 text-sm ${
        active ? 'border-mint bg-mint/10 font-semibold text-mint' : 'border-line bg-white text-slate-600'
      }`}
    >
      {children}
    </span>
  );
}
