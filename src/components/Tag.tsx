interface TagProps {
  children: string;
  active?: boolean;
}

export function Tag({ children, active = false }: TagProps) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-full border px-3 text-sm ${
        active ? 'border-neutral-300 bg-neutral-100 font-semibold text-neutral-800' : 'border-neutral-200 bg-white text-neutral-500'
      }`}
    >
      {children}
    </span>
  );
}
