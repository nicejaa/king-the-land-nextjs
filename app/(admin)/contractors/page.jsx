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
import { useDebounce } from "hooks/use-debounce";
import { useDataTable } from "hooks/use-data-table";
import Link from "next/link";
import { PlusIcon, PencilIcon, TrashIcon, ArrowRightIcon } from "lucide-react";
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
  company_name: z.string().min(1, "กรุณากรอกชื่อบริษัท"),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  username: z.string().optional().or(z.literal("")),
  address: z.string().optional(),
});

export default function ContractorsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const { data, total, page, setPage, loading, refresh } = useDataTable(
    "/api/contractors", { search: debouncedSearch }
  );

  const form = useForm({ resolver: zodResolver(schema) });

  const openCreate = () => { form.reset({ company_name: "", contact_name: "", phone: "", username: "", address: "" }); setEditTarget(null); setFormOpen(true); };
  const openEdit = (row) => { form.reset(row); setEditTarget(row); setFormOpen(true); };

  const onSubmit = async (values) => {
    try {
      if (editTarget) { await axios.patch(`/api/contractors/${editTarget.id}`, values); toast.success("อัพเดทสำเร็จ"); }
      else { await axios.post("/api/contractors", values); toast.success("สร้างสำเร็จ"); }
      setFormOpen(false); refresh();
    } catch (err) { toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด"); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try { await axios.delete(`/api/contractors/${deleteId}`); toast.success("ลบสำเร็จ"); setDeleteId(null); refresh(); }
    catch { toast.error("ลบไม่สำเร็จ"); } finally { setDeleteLoading(false); }
  };

  const columns = [
    {
      accessorKey: "company_name", header: "ชื่อบริษัท",
      cell: ({ row }) => (
        <Link href={`/contractors/${row.original.id}`} className="font-medium hover:underline text-primary">
          {row.original.company_name}
        </Link>
      ),
    },
    { accessorKey: "contact_name", header: "ผู้ติดต่อ", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "phone", header: "เบอร์โทร", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "username", header: "อีเมล", cell: ({ getValue }) => getValue() ?? "-" },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" className="size-7" asChild>
            <Link href={`/contractors/${row.original.id}`}><ArrowRightIcon className="size-3.5" /></Link>
          </Button>
          <PermissionGuard permission={PERMISSIONS.CONTRACTOR_UPDATE}>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(row.original)}><PencilIcon className="size-3.5" /></Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.CONTRACTOR_DELETE}>
            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteId(row.original.id)}><TrashIcon className="size-3.5" /></Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="ผู้รับเหมา" description="จัดการข้อมูลผู้รับเหมา">
        <PermissionGuard permission={PERMISSIONS.CONTRACTOR_CREATE}>
          <Button onClick={openCreate} size="sm"><PlusIcon className="size-4 mr-1" /> เพิ่มผู้รับเหมา</Button>
        </PermissionGuard>
      </PageHeader>

      <DataTable columns={columns} data={data} loading={loading} totalRows={total} page={page} pageSize={20} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="ค้นหาผู้รับเหมา..." />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTarget ? "แก้ไขผู้รับเหมา" : "เพิ่มผู้รับเหมา"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem><FormLabel>ชื่อบริษัท *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contact_name" render={({ field }) => (
                  <FormItem><FormLabel>ผู้ติดต่อ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>เบอร์โทร</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem><FormLabel>อีเมล</FormLabel><FormControl><Input type="username" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>ที่อยู่</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
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

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="ลบผู้รับเหมา" description="ต้องการลบผู้รับเหมานี้หรือไม่?" onConfirm={handleDelete} loading={deleteLoading} />
    </div>
  );
}
