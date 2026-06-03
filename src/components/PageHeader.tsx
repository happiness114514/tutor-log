interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-end justify-between gap-3 pt-1">
      <div>
        <h1 className="text-[28px] font-semibold tracking-normal text-neutral-950">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-neutral-500">{subtitle}</p> : null}
      </div>
    </header>
  );
}
