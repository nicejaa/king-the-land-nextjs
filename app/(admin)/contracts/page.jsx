"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "components/ui/page-header";
import { DataTable } from "components/ui/data-table";
import { Button } from "components/ui/button";
import { StatusBadge } from "components/ui/status-badge";
import { ConfirmDialog } from "components/ui/confirm-dialog";
import { PermissionGuard } from "components/guards/PermissionGuard";
import { PERMISSIONS } from "constants/permissions";
import { useDebounce } from "hooks/use-debounce";
import { useDataTable } from "hooks/use-data-table";
import { formatDate, formatCurrency } from "lib/utils";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "components/ui/form";
import { Input } from "components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "components/ui/select";
import { LoadingSpinner } from "components/ui/loading-screen";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "ร่าง" },
  { value: "ACTIVE", label: "ใช้งาน" },
  { value: "COMPLETED", label: "เสร็จสิ้น" },
  { value: "TERMINATED", label: "ยกเลิก" },
];

const schema = z.object({
  project_id: z.string().min(1, "กรุณาระบุโครงการ"),
  contractor_id: z.string().min(1, "กรุณาระบุผู้รับเหมา"),
  title: z.string().min(1, "กรุณากรอกชื่อสัญญา"),
  contract_no: z.string().optional(),
  contract_value: z.coerce.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.string().optional(),
});

export default function ContractsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const { data, total, page, setPage, loading, refresh } = useDataTable("/api/contracts", { search: debouncedSearch });
  const form = useForm({ resolver: zodResolver(schema) });

  const openCreate = () => { form.reset({ project_id: "", contractor_id: "", title: "", contract_no: "", status: "DRAFT" }); setEditTarget(null); setFormOpen(true); };
  const openEdit = (row) => { form.reset({ ...row, contract_value: row.contract_value ?? "" }); setEditTarget(row); setFormOpen(true); };

  const onSubmit = async (values) => {
    try {
      if (editTarget) { await axios.patch(`/api/contracts/${editTarget.id}`, values); toast.success("อัพเดทสัญญาสำเร็จ"); }
      else { await axios.post("/api/contracts", values); toast.success("สร้างสัญญาสำเร็จ"); }
      setFormOpen(false); refresh();
    } catch (err) { toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด"); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try { await axios.delete(`/api/contracts/${deleteId}`); toast.success("ลบสำเร็จ"); setDeleteId(null); refresh(); }
    catch { toast.error("ลบไม่สำเร็จ"); } finally { setDeleteLoading(false); }
  };

  const columns = [
    { accessorKey: "contract_no", header: "เลขสัญญา", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "title", header: "ชื่อสัญญา" },
    { accessorKey: "project_name", header: "โครงการ", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "contractor_name", header: "ผู้รับเหมา", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "contract_value", header: "มูลค่า", cell: ({ getValue }) => formatCurrency(getValue()) },
    { accessorKey: "status", header: "สถานะ", cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
    { accessorKey: "end_date", header: "วันสิ้นสุด", cell: ({ getValue }) => formatDate(getValue()) },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <PermissionGuard permission={PERMISSIONS.CONTRACT_UPDATE}>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(row.original)}><PencilIcon className="size-3.5" /></Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.CONTRACT_DELETE}>
            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteId(row.original.id)}><TrashIcon className="size-3.5" /></Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="สัญญา" description="จัดการสัญญาจ้างผู้รับเหมา">
        <PermissionGuard permission={PERMISSIONS.CONTRACT_CREATE}>
          <Button onClick={openCreate} size="sm"><PlusIcon className="size-4 mr-1" /> เพิ่มสัญญา</Button>
        </PermissionGuard>
      </PageHeader>

      <DataTable columns={columns} data={data} loading={loading} totalRows={total} page={page} pageSize={20} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="ค้นหาสัญญา..." />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTarget ? "แก้ไขสัญญา" : "เพิ่มสัญญา"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="project_id" render={({ field }) => (
                  <FormItem><FormLabel>รหัสโครงการ *</FormLabel><FormControl><Input placeholder="UUID" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contractor_id" render={({ field }) => (
                  <FormItem><FormLabel>รหัสผู้รับเหมา *</FormLabel><FormControl><Input placeholder="UUID" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>ชื่อสัญญา *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contract_no" render={({ field }) => (
                  <FormItem><FormLabel>เลขสัญญา</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contract_value" render={({ field }) => (
                  <FormItem><FormLabel>มูลค่าสัญญา</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start_date" render={({ field }) => (
                  <FormItem><FormLabel>วันเริ่ม</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="end_date" render={({ field }) => (
                  <FormItem><FormLabel>วันสิ้นสุด</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>สถานะ</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="เลือกสถานะ" /></SelectTrigger></FormControl>
                    <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>ยกเลิก</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <LoadingSpinner className="mr-2" />}
                  {editTarget ? "บันทึก" : "สร้าง"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="ลบสัญญา" description="ต้องการลบสัญญานี้หรือไม่?" onConfirm={handleDelete} loading={deleteLoading} />
    </div>
  );
}
