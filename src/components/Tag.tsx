interface TagProps {
  children: string;
  active?: boolean;
}

export function Tag({ children, active = false }: TagProps) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-full border px-3 text-sm ${
        active ? 'border-neutral-900 bg-neutral-900 font-semibold text-white' : 'border-neutral-200 bg-white text-neutral-500'
      }`}
    >
      {children}
    </span>
  );
}
