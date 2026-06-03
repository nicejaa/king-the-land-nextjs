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
import { ConfirmDialog } from "components/ui/confirm-dialog";
import { PermissionGuard } from "components/guards/PermissionGuard";
import { PERMISSIONS } from "constants/permissions";
import { useDataTable } from "hooks/use-data-table";
import { formatDate } from "lib/utils";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "components/ui/form";
import { Input } from "components/ui/input";
import { Textarea } from "components/ui/textarea";
import { LoadingSpinner } from "components/ui/loading-screen";

const schema = z.object({
  project_id: z.string().min(1, "กรุณาระบุโครงการ"),
  log_date: z.string().min(1, "กรุณาเลือกวันที่"),
  weather: z.string().optional(),
  manpower_count: z.coerce.number().int().min(0).optional(),
  note: z.string().optional(),
});

export default function DailyLogsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, total, page, setPage, loading, refresh } = useDataTable("/api/daily-logs");
  const form = useForm({ resolver: zodResolver(schema) });

  const openCreate = () => { form.reset({ project_id: "", log_date: new Date().toISOString().slice(0, 10), weather: "", manpower_count: "", note: "" }); setEditTarget(null); setFormOpen(true); };
  const openEdit = (row) => { form.reset({ ...row, log_date: row.log_date?.slice(0, 10) ?? "" }); setEditTarget(row); setFormOpen(true); };

  const onSubmit = async (values) => {
    try {
      if (editTarget) { await axios.patch(`/api/daily-logs/${editTarget.id}`, values); toast.success("อัพเดทสำเร็จ"); }
      else { await axios.post("/api/daily-logs", values); toast.success("สร้างสำเร็จ"); }
      setFormOpen(false); refresh();
    } catch (err) { toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด"); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try { await axios.delete(`/api/daily-logs/${deleteId}`); toast.success("ลบสำเร็จ"); setDeleteId(null); refresh(); }
    catch { toast.error("ลบไม่สำเร็จ"); } finally { setDeleteLoading(false); }
  };

  const columns = [
    { accessorKey: "log_date", header: "วันที่", cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: "project_name", header: "โครงการ", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "weather", header: "สภาพอากาศ", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "manpower_count", header: "จำนวนแรงงาน", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "created_by_name", header: "บันทึกโดย", cell: ({ getValue }) => getValue() ?? "-" },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <PermissionGuard permission={PERMISSIONS.DAILY_LOG_UPDATE}>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(row.original)}><PencilIcon className="size-3.5" /></Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.DAILY_LOG_DELETE}>
            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteId(row.original.id)}><TrashIcon className="size-3.5" /></Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="บันทึกประจำวัน" description="บันทึกความคืบหน้าและเหตุการณ์ประจำวัน">
        <PermissionGuard permission={PERMISSIONS.DAILY_LOG_CREATE}>
          <Button onClick={openCreate} size="sm"><PlusIcon className="size-4 mr-1" /> เพิ่มบันทึก</Button>
        </PermissionGuard>
      </PageHeader>

      <DataTable columns={columns} data={data} loading={loading} totalRows={total} page={page} pageSize={20} onPageChange={setPage} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTarget ? "แก้ไขบันทึก" : "เพิ่มบันทึก"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="project_id" render={({ field }) => (
                <FormItem><FormLabel>รหัสโครงการ *</FormLabel><FormControl><Input placeholder="UUID" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="log_date" render={({ field }) => (
                  <FormItem><FormLabel>วันที่ *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="manpower_count" render={({ field }) => (
                  <FormItem><FormLabel>จำนวนแรงงาน</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="weather" render={({ field }) => (
                <FormItem><FormLabel>สภาพอากาศ</FormLabel><FormControl><Input placeholder="แดด / ฝน / มีเมฆ" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem><FormLabel>หมายเหตุ</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
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

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="ลบบันทึก" description="ต้องการลบบันทึกนี้หรือไม่?" onConfirm={handleDelete} loading={deleteLoading} />
    </div>
  );
}
