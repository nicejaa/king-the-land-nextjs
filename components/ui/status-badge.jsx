import { Badge } from "components/ui/badge";
import { cn } from "lib/utils";

const statusColorMap = {
  // Project
  PLANNING: "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  ON_HOLD: "bg-yellow-100 text-yellow-700 border-yellow-200",
  COMPLETED: "bg-gray-100 text-gray-700 border-gray-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  TERMINATED: "bg-red-100 text-red-700 border-red-200",

  // Task
  PENDING: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  DONE: "bg-green-100 text-green-700 border-green-200",

  // Defect
  OPEN: "bg-red-100 text-red-700 border-red-200",
  ASSIGNED: "bg-orange-100 text-orange-700 border-orange-200",
  FIXING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  VERIFYING: "bg-purple-100 text-purple-700 border-purple-200",
  CLOSED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-gray-100 text-gray-700 border-gray-200",

  // PO
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  ORDERED: "bg-blue-100 text-blue-700 border-blue-200",
  DELIVERED: "bg-teal-100 text-teal-700 border-teal-200",
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",

  // Boolean
  true: "bg-green-100 text-green-700 border-green-200",
  false: "bg-red-100 text-red-700 border-red-200",
};

/**
 * @param {{ status: string; label?: string; className?: string }} props
 */
export function StatusBadge({ status, label, className }) {
  const colorClass =
    statusColorMap[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        colorClass,
        className
      )}
    >
      {label ?? status}
    </span>
  );
}
