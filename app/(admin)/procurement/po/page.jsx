"use client";

import { PageHeader } from "components/ui/page-header";
import { DataTable } from "components/ui/data-table";
import { StatusBadge } from "components/ui/status-badge";
import { useDataTable } from "hooks/use-data-table";
import { formatDate, formatCurrency } from "lib/utils";

const STATUS_LABELS = { DRAFT: "ร่าง", APPROVED: "อนุมัติ", ORDERED: "สั่งซื้อ", DELIVERED: "ส่งมอบ", PAID: "ชำระแล้ว", CANCELLED: "ยกเลิก" };

export default function POPage() {
  const { data, total, page, setPage, loading } = useDataTable("/api/purchase-orders");

  const columns = [
    { accessorKey: "po_no", header: "เลข PO", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "project_name", header: "โครงการ", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "supplier_name", header: "ผู้ขาย" },
    { accessorKey: "total_amount", header: "มูลค่า", cell: ({ getValue }) => formatCurrency(getValue()) },
    { accessorKey: "status", header: "สถานะ", cell: ({ getValue }) => <StatusBadge status={getValue()} label={STATUS_LABELS[getValue()] ?? getValue()} /> },
    { accessorKey: "created_at", header: "วันที่", cell: ({ getValue }) => formatDate(getValue()) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="ใบสั่งซื้อ (PO)" description="จัดการใบสั่งซื้อ" />
      <DataTable columns={columns} data={data} loading={loading} totalRows={total} page={page} pageSize={20} onPageChange={setPage} />
    </div>
  );
}
