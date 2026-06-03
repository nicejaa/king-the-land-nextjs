"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "components/ui/page-header";
import { StatusBadge } from "components/ui/status-badge";
import { Input } from "components/ui/input";
import { Button } from "components/ui/button";
import { useDebounce } from "hooks/use-debounce";
import { useDataTable } from "hooks/use-data-table";
import { formatCurrency } from "lib/utils";
import { FolderKanbanIcon, ArrowRightIcon } from "lucide-react";

const STATUS_COLORS = {
  ACTIVE: "bg-green-100 text-green-800",
  PLANNING: "bg-blue-100 text-blue-800",
  ON_HOLD: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const { data: projects, loading } = useDataTable("/api/projects", { search: debouncedSearch }, 100);

  return (
    <div className="space-y-6">
      <PageHeader title="งาน (WBS)" description="เลือกโครงการเพื่อดูและจัดการ Work Breakdown Structure" />

      <Input
        placeholder="ค้นหาโครงการ..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 w-64"
      />

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">ไม่มีโครงการ</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div key={p.id} className="rounded-lg border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FolderKanbanIcon className="size-4 text-primary shrink-0" />
                <span className="font-medium truncate">{p.name}</span>
              </div>
              <StatusBadge status={p.status} />
            </div>
            {p.budget && (
              <p className="text-sm text-muted-foreground">งบโครงการ: {formatCurrency(p.budget)}</p>
            )}
            <Link href={`/tasks/${p.id}`} className="mt-auto">
              <Button size="sm" variant="outline" className="w-full">
                เปิด WBS <ArrowRightIcon className="size-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
