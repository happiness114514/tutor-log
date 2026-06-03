interface SectionTitleProps {
  children: string;
  action?: string;
}

export function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-base font-semibold text-neutral-900">{children}</h2>
      {action ? <span className="text-sm font-medium text-neutral-500">{action}</span> : null}
    </div>
  );
}
