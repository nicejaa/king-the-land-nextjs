"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { PageHeader } from "components/ui/page-header";
import { DataTable } from "components/ui/data-table";
import { Button } from "components/ui/button";
import { StatusBadge } from "components/ui/status-badge";
import { PermissionGuard } from "components/guards/PermissionGuard";
import { PERMISSIONS } from "constants/permissions";
import { useDataTable } from "hooks/use-data-table";
import { formatDate } from "lib/utils";
import { CheckIcon, XIcon } from "lucide-react";

export default function PRPage() {
  const { data, total, page, setPage, loading, refresh } = useDataTable("/api/purchase-requests");

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`/api/purchase-requests/${id}`, { status });
      toast.success(status === "APPROVED" ? "อนุมัติสำเร็จ" : "ปฏิเสธแล้ว");
      refresh();
    } catch { toast.error("เกิดข้อผิดพลาด"); }
  };

  const columns = [
    { accessorKey: "title", header: "ชื่อ PR" },
    { accessorKey: "project_name", header: "โครงการ", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "requested_by_name", header: "ผู้ขอ", cell: ({ getValue }) => getValue() ?? "-" },
    {
      accessorKey: "status", header: "สถานะ",
      cell: ({ getValue }) => {
        const labels = { PENDING: "รออนุมัติ", APPROVED: "อนุมัติแล้ว", REJECTED: "ปฏิเสธ" };
        return <StatusBadge status={getValue()} label={labels[getValue()] ?? getValue()} />;
      },
    },
    { accessorKey: "created_at", header: "วันที่", cell: ({ getValue }) => formatDate(getValue()) },
    {
      id: "actions", header: "",
      cell: ({ row }) =>
        row.original.status === "PENDING" ? (
          <PermissionGuard permission={PERMISSIONS.PR_APPROVE}>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="size-7 text-green-600" onClick={() => updateStatus(row.original.id, "APPROVED")}>
                <CheckIcon className="size-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => updateStatus(row.original.id, "REJECTED")}>
                <XIcon className="size-3.5" />
              </Button>
            </div>
          </PermissionGuard>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="ใบขอซื้อ (PR)" description="จัดการใบขอซื้อและอนุมัติ" />
      <DataTable columns={columns} data={data} loading={loading} totalRows={total} page={page} pageSize={20} onPageChange={setPage} />
    </div>
  );
}
