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
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from "lucide-react";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "components/ui/form";
import { Input } from "components/ui/input";
import { Textarea } from "components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "components/ui/select";
import { LoadingSpinner } from "components/ui/loading-screen";

const schema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อโครงการ"),
  description: z.string().optional(),
  budget: z.coerce.number().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.string().optional(),
});

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "วางแผน" },
  { value: "ACTIVE", label: "ดำเนินการ" },
  { value: "ON_HOLD", label: "หยุดชั่วคราว" },
  { value: "COMPLETED", label: "เสร็จสิ้น" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

export default function ProjectsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(search);

  const { data, total, page, setPage, loading, refresh } = useDataTable(
    "/api/projects",
    { search: debouncedSearch, status: statusFilter }
  );

  const form = useForm({ resolver: zodResolver(schema) });

  const openCreate = () => { form.reset({ name: "", description: "", status: "PLANNING" }); setEditTarget(null); setFormOpen(true); };
  const openEdit = (row) => { form.reset({ ...row, budget: row.budget ?? "" }); setEditTarget(row); setFormOpen(true); };

  const onSubmit = async (values) => {
    try {
      if (editTarget) {
        await axios.patch(`/api/projects/${editTarget.id}`, values);
        toast.success("อัพเดทโครงการสำเร็จ");
      } else {
        await axios.post("/api/projects", values);
        toast.success("สร้างโครงการสำเร็จ");
      }
      setFormOpen(false);
      refresh();
    } catch (err) { toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด"); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`/api/projects/${deleteId}`);
      toast.success("ลบโครงการสำเร็จ");
      setDeleteId(null);
      refresh();
    } catch { toast.error("ลบไม่สำเร็จ"); }
    finally { setDeleteLoading(false); }
  };

  const columns = [
    { accessorKey: "name", header: "ชื่อโครงการ" },
    { accessorKey: "status", header: "สถานะ", cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
    { accessorKey: "budget", header: "งบประมาณ", cell: ({ getValue }) => formatCurrency(getValue()) },
    { accessorKey: "start_date", header: "เริ่มต้น", cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: "end_date", header: "สิ้นสุด", cell: ({ getValue }) => formatDate(getValue()) },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="size-7" asChild>
            <Link href={`/projects/${row.original.id}`}><EyeIcon className="size-3.5" /></Link>
          </Button>
          <PermissionGuard permission={PERMISSIONS.PROJECT_UPDATE}>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(row.original)}>
              <PencilIcon className="size-3.5" />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.PROJECT_DELETE}>
            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteId(row.original.id)}>
              <TrashIcon className="size-3.5" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="โครงการ" description="จัดการโครงการก่อสร้างทั้งหมด">
        <PermissionGuard permission={PERMISSIONS.PROJECT_CREATE}>
          <Button onClick={openCreate} size="sm">
            <PlusIcon className="size-4 mr-1" /> เพิ่มโครงการ
          </Button>
        </PermissionGuard>
      </PageHeader>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        totalRows={total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="ค้นหาโครงการ..."
        toolbar={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="สถานะ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTarget ? "แก้ไขโครงการ" : "เพิ่มโครงการ"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>ชื่อโครงการ *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>คำอธิบาย</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="budget" render={({ field }) => (
                  <FormItem><FormLabel>งบประมาณ</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>สถานะ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="เลือกสถานะ" /></SelectTrigger></FormControl>
                      <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
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

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="ลบโครงการ" description="ต้องการลบโครงการนี้หรือไม่?" onConfirm={handleDelete} loading={deleteLoading} />
    </div>
  );
}
