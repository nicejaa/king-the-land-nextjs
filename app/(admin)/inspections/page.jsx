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
import { Badge } from "components/ui/badge";
import { PermissionGuard } from "components/guards/PermissionGuard";
import { PERMISSIONS } from "constants/permissions";
import { useDataTable } from "hooks/use-data-table";
import { formatDate } from "lib/utils";
import { PlusIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "components/ui/form";
import { Input } from "components/ui/input";
import { Switch } from "components/ui/switch";
import { Textarea } from "components/ui/textarea";
import { LoadingSpinner } from "components/ui/loading-screen";

const schema = z.object({
  work_task_id: z.string().min(1, "กรุณาระบุงาน"),
  inspection_date: z.string().min(1, "กรุณาเลือกวันที่"),
  passed: z.boolean(),
  remark: z.string().optional(),
});

export default function InspectionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const { data, total, page, setPage, loading, refresh } = useDataTable("/api/inspections");
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { passed: true } });

  const openCreate = () => {
    form.reset({ work_task_id: "", inspection_date: new Date().toISOString().slice(0, 10), passed: true, remark: "" });
    setFormOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      await axios.post("/api/inspections", values);
      toast.success("บันทึกการตรวจสอบสำเร็จ");
      setFormOpen(false);
      refresh();
    } catch (err) { toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด"); }
  };

  const columns = [
    { accessorKey: "task_title", header: "งาน", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "inspection_date", header: "วันที่ตรวจ", cell: ({ getValue }) => formatDate(getValue()) },
    {
      accessorKey: "passed", header: "ผลการตรวจ",
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? "default" : "destructive"}>
          {getValue() ? "ผ่าน" : "ไม่ผ่าน"}
        </Badge>
      ),
    },
    { accessorKey: "remark", header: "หมายเหตุ", cell: ({ getValue }) => getValue() ?? "-" },
    { accessorKey: "inspected_by_name", header: "ตรวจโดย", cell: ({ getValue }) => getValue() ?? "-" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="ตรวจสอบคุณภาพ" description="บันทึกผลการตรวจสอบงาน">
        <PermissionGuard permission={PERMISSIONS.INSPECTION_CREATE}>
          <Button onClick={openCreate} size="sm"><PlusIcon className="size-4 mr-1" /> เพิ่มการตรวจ</Button>
        </PermissionGuard>
      </PageHeader>

      <DataTable columns={columns} data={data} loading={loading} totalRows={total} page={page} pageSize={20} onPageChange={setPage} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>บันทึกผลการตรวจสอบ</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="work_task_id" render={({ field }) => (
                <FormItem><FormLabel>รหัสงาน *</FormLabel><FormControl><Input placeholder="UUID" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="inspection_date" render={({ field }) => (
                <FormItem><FormLabel>วันที่ตรวจ *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="passed" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">ผ่านการตรวจ</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="remark" render={({ field }) => (
                <FormItem><FormLabel>หมายเหตุ</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>ยกเลิก</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <LoadingSpinner className="mr-2" />}บันทึก
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
