"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "components/ui/page-header";
import { Input } from "components/ui/input";
import { Button } from "components/ui/button";
import { StatusBadge } from "components/ui/status-badge";
import { LoadingSpinner } from "components/ui/loading-screen";
import { useDataTable } from "hooks/use-data-table";
import { useDebounce } from "hooks/use-debounce";
import { formatDate } from "lib/utils";
import { MessageSquareIcon, PaperclipIcon, ChevronRightIcon } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "ทั้งหมด" },
  { value: "PENDING", label: "รอดำเนินการ" },
  { value: "IN_PROGRESS", label: "กำลังดำเนินการ" },
  { value: "DONE", label: "เสร็จแล้ว" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

const STATUS_LABELS = { PENDING: "รอดำเนินการ", IN_PROGRESS: "กำลังดำเนินการ", DONE: "เสร็จแล้ว", CANCELLED: "ยกเลิก" };

export default function MyTasksPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: tasks, loading } = useDataTable(
    "/api/my-tasks",
    { search: debouncedSearch, status },
    50
  );

  return (
    <div className="space-y-6">
      <PageHeader title="งานของฉัน" description="รายการงานที่ได้รับมอบหมาย" />

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="ค้นหางาน..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant={status === s.value ? "default" : "outline"}
              onClick={() => setStatus(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">ยังไม่มีงานที่ได้รับมอบหมาย</div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => router.push(`/my-tasks/${task.id}`)}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{task.project_name}</span>
                  {task.parent_title && (
                    <>
                      <span className="text-xs text-muted-foreground">›</span>
                      <span className="text-xs text-muted-foreground">{task.parent_title}</span>
                    </>
                  )}
                </div>
                <p className="font-medium truncate">{task.title}</p>
                {task.planned_end && (
                  <p className="text-xs text-muted-foreground mt-0.5">กำหนดเสร็จ: {formatDate(task.planned_end)}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {Number(task.comment_count) > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquareIcon className="size-3.5" />{task.comment_count}
                  </span>
                )}
                {Number(task.attachment_count) > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <PaperclipIcon className="size-3.5" />{task.attachment_count}
                  </span>
                )}
                <StatusBadge status={task.status} label={STATUS_LABELS[task.status]} />
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
