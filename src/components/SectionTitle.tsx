interface SectionTitleProps {
  children: string;
  action?: string;
}

export function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between">
      <h2 className="text-base font-semibold text-ink">{children}</h2>
      {action ? <span className="text-sm font-medium text-mint">{action}</span> : null}
    </div>
  );
}
