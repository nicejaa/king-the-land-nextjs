import { InboxIcon } from "lucide-react";
import { cn } from "lib/utils";

/**
 * @param {{ title?: string; description?: string; icon?: React.ComponentType; children?: React.ReactNode; className?: string }} props
 */
export function EmptyState({
  title = "ไม่พบข้อมูล",
  description = "ยังไม่มีข้อมูลในระบบ",
  icon: Icon = InboxIcon,
  children,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      <div className="bg-muted rounded-full p-4">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-base">{title}</p>
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}
