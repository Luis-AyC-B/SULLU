interface PageContainerProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}

export function PageContainer({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: PageContainerProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-headline text-primary">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-body text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {actionLabel && (
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {actionLabel}
          </button>
          
        )}
      </div>

      <div>{children}</div>
    </div>
  );
}