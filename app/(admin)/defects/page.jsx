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
import { formatDate } from "lib/utils";
import { useRouter } from "next/navigation";
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from "lucide-react";
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

const SEVERITY_OPTIONS = [
  { value: "LOW", label: "ต่ำ" },
  { value: "MEDIUM", label: "ปานกลาง" },
  { value: "HIGH", label: "สูง" },
  { value: "CRITICAL", label: "วิกฤต" },
];

const STATUS_OPTIONS = [
  { value: "OPEN", label: "เปิดเคส" },
  { value: "ASSIGNED", label: "มอบหมายแล้ว" },
  { value: "FIXING", label: "กำลังดำเนินการแก้" },
  { value: "VERIFYING", label: "รอ QA ตรวจสอบ" },
  { value: "CLOSED", label: "จบเคส (ผ่านแล้ว)" },
  { value: "REJECTED", label: "ไม่ผ่าน (ต้องแก้ใหม่)" },
];

const schema = z.object({
  project_id: z.string().min(1, "กรุณาระบุโครงการ"),
  title: z.string().min(1, "กรุณากรอกชื่อข้อบกพร่อง"),
  description: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
  due_date: z.string().optional(),
});

export default function DefectsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(search);

  const { data, total, page, setPage, loading, refresh } = useDataTable(
    "/api/defects", { search: debouncedSearch, status: statusFilter }
  );
  const form = useForm({ resolver: zodResolver(schema) });

  const openCreate = () => { form.reset({ project_id: "", title: "", severity: "MEDIUM", status: "OPEN" }); setEditTarget(null); setFormOpen(true); };
  const openEdit = (row) => { form.reset(row); setEditTarget(row); setFormOpen(true); };

  const onSubmit = async (values) => {
    try {
      if (editTarget) { await axios.patch(`/api/defects/${editTarget.id}`, values); toast.success("อัพเดทสำเร็จ"); }
      else { await axios.post("/api/defects", values); toast.success("สร้างสำเร็จ"); }
      setFormOpen(false); refresh();
    } catch (err) { toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด"); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try { await axios.delete(`/api/defects/${deleteId}`); toast.success("ลบสำเร็จ"); setDeleteId(null); refresh(); }
    catch { toast.error("ลบไม่สำเร็จ"); } finally { setDeleteLoading(false); }
  };

  const router = useRouter();

  const columns = [
    { accessorKey: "title", header: "หัวข้อ", cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
    { accessorKey: "project_name", header: "โครงการ", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "severity", header: "ระดับ", cell: ({ getValue }) => <StatusBadge status={getValue()} label={SEVERITY_OPTIONS.find(s=>s.value===getValue())?.label ?? getValue()} /> },
    { accessorKey: "status", header: "สถานะ", cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
    { accessorKey: "assigned_to_name", header: "ผู้รับผิดชอบ", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "due_date", header: "กำหนด", cell: ({ getValue }) => formatDate(getValue()) },
    {
      id: "actions", header: "",
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex gap-1">
            {d.work_task_id && (
              <Button size="icon" variant="ghost" className="size-7" title="ดูในงาน" onClick={() => router.push(`/my-tasks/${d.work_task_id}`)}>
                <EyeIcon className="size-3.5" />
              </Button>
            )}
            <PermissionGuard permission={PERMISSIONS.DEFECT_UPDATE}>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(row.original)}><PencilIcon className="size-3.5" /></Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.DEFECT_DELETE}>
              <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteId(row.original.id)}><TrashIcon className="size-3.5" /></Button>
            </PermissionGuard>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="ข้อบกพร่อง" description="ติดตามและจัดการข้อบกพร่องในโครงการ">
        <PermissionGuard permission={PERMISSIONS.DEFECT_CREATE}>
          <Button onClick={openCreate} size="sm"><PlusIcon className="size-4 mr-1" /> เพิ่มข้อบกพร่อง</Button>
        </PermissionGuard>
      </PageHeader>

      <DataTable columns={columns} data={data} loading={loading} totalRows={total} page={page} pageSize={20} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="ค้นหาข้อบกพร่อง..."
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
          <DialogHeader><DialogTitle>{editTarget ? "แก้ไขข้อบกพร่อง" : "เพิ่มข้อบกพร่อง"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="project_id" render={({ field }) => (
                <FormItem><FormLabel>รหัสโครงการ *</FormLabel><FormControl><Input placeholder="UUID" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>หัวข้อ *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>รายละเอียด</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="severity" render={({ field }) => (
                  <FormItem><FormLabel>ระดับความรุนแรง</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger></FormControl>
                      <SelectContent>{SEVERITY_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>สถานะ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger></FormControl>
                      <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="due_date" render={({ field }) => (
                <FormItem><FormLabel>กำหนดแก้ไข</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
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

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="ลบข้อบกพร่อง" description="ต้องการลบข้อบกพร่องนี้หรือไม่?" onConfirm={handleDelete} loading={deleteLoading} />
    </div>
  );
}
