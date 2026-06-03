"use client";

import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "components/ui/page-header";
import { DataTable } from "components/ui/data-table";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { ConfirmDialog } from "components/ui/confirm-dialog";
import { PermissionGuard } from "components/guards/PermissionGuard";
import { PERMISSIONS } from "constants/permissions";
import { useDebounce } from "hooks/use-debounce";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "components/ui/select";
import { LoadingSpinner } from "components/ui/loading-screen";
import { ROLES, ROLE_LABELS } from "constants/roles";

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }));

const userFormSchema = z.object({
  username: z.string().min(1, "กรุณากรอก Username"),
  password: z.string().min(8, "อย่างน้อย 8 ตัวอักษร").optional().or(z.literal("")),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "กรุณาเลือกบทบาท"),
});

export default function UsersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const { data, total, page, setPage, loading, refresh } = useDataTable(
    "/api/users",
    { search: debouncedSearch }
  );

  const form = useForm({ resolver: zodResolver(userFormSchema) });

  const openCreate = () => { form.reset({ username: "", password: "", first_name: "", last_name: "", phone: "", role: "" }); setEditTarget(null); setFormOpen(true); };
  const openEdit = (row) => { form.reset({ ...row, password: "" }); setEditTarget(row); setFormOpen(true); };

  const onSubmit = async (values) => {
    try {
      const payload = { ...values };
      if (!payload.password) delete payload.password;
      if (editTarget) {
        await axios.patch(`/api/users/${editTarget.id}`, payload);
        toast.success("อัพเดทผู้ใช้สำเร็จ");
      } else {
        if (!payload.password) { form.setError("password", { message: "กรุณากรอกรหัสผ่าน" }); return; }
        await axios.post("/api/users", payload);
        toast.success("สร้างผู้ใช้สำเร็จ");
      }
      setFormOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`/api/users/${deleteId}`);
      toast.success("ลบผู้ใช้สำเร็จ");
      setDeleteId(null);
      refresh();
    } catch { toast.error("ลบไม่สำเร็จ"); }
    finally { setDeleteLoading(false); }
  };

  const columns = [
    { accessorKey: "username", header: "อีเมล" },
    { accessorKey: "first_name", header: "ชื่อ", cell: ({ row }) => `${row.original.first_name ?? ""} ${row.original.last_name ?? ""}`.trim() || "-" },
    { accessorKey: "role", header: "บทบาท", cell: ({ getValue }) => <Badge variant="secondary">{ROLE_LABELS[getValue()] ?? getValue()}</Badge> },
    { accessorKey: "is_active", header: "สถานะ", cell: ({ getValue }) => <Badge variant={getValue() ? "default" : "destructive"}>{getValue() ? "ใช้งาน" : "ปิดใช้งาน"}</Badge> },
    { accessorKey: "created_at", header: "วันที่สร้าง", cell: ({ getValue }) => formatDate(getValue()) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <PermissionGuard permission={PERMISSIONS.USER_UPDATE}>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(row.original)}>
              <PencilIcon className="size-3.5" />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.USER_DELETE}>
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
      <PageHeader title="ผู้ใช้งาน" description="จัดการบัญชีผู้ใช้ในระบบ">
        <PermissionGuard permission={PERMISSIONS.USER_CREATE}>
          <Button onClick={openCreate} size="sm">
            <PlusIcon className="size-4 mr-1" /> เพิ่มผู้ใช้
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
        searchPlaceholder="ค้นหาผู้ใช้..."
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel>ชื่อ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel>นามสกุล</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem><FormLabel>อีเมล *</FormLabel><FormControl><Input type="username" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>{editTarget ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน *"}</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>เบอร์โทร</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>บทบาท *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="เลือกบทบาท" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
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

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="ลบผู้ใช้"
        description="ต้องการลบผู้ใช้นี้หรือไม่? ข้อมูลจะถูกลบถาวร"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
