import { Loader2Icon } from "lucide-react";
import { cn } from "lib/utils";

export function LoadingScreen({ className, text = "กำลังโหลด..." }) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center gap-3",
        className
      )}
    >
      <Loader2Icon className="size-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}

export function LoadingSpinner({ className }) {
  return <Loader2Icon className={cn("size-4 animate-spin", className)} />;
}
