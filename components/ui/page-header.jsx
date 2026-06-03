import { cn } from "lib/utils";

/**
 * @param {{ title: string; description?: string; children?: React.ReactNode; className?: string }} props
 */
export function PageHeader({ title, description, children, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 mt-2 sm:mt-0">{children}</div>
      )}
    </div>
  );
}
