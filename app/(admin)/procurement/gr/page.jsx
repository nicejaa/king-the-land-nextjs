"use client";

import { PageHeader } from "components/ui/page-header";
import { DataTable } from "components/ui/data-table";
import { useDataTable } from "hooks/use-data-table";
import { formatDate } from "lib/utils";

export default function GRPage() {
  const { data, total, page, setPage, loading } = useDataTable("/api/goods-receipts");

  const columns = [
    { accessorKey: "po_no", header: "เลข PO อ้างอิง", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "supplier_name", header: "ผู้ขาย", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "received_date", header: "วันที่รับ", cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: "received_by_name", header: "รับโดย", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "note", header: "หมายเหตุ", cell: ({ getValue }) => getValue() ?? "-" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="รับของ (GR)" description="บันทึกการรับวัสดุและอุปกรณ์" />
      <DataTable columns={columns} data={data} loading={loading} totalRows={total} page={page} pageSize={20} onPageChange={setPage} />
    </div>
  );
}
