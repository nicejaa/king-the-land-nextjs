"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "components/ui/page-header";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { Checkbox } from "components/ui/checkbox";
import { ConfirmDialog } from "components/ui/confirm-dialog";
import { PermissionGuard } from "components/guards/PermissionGuard";
import { LoadingScreen, LoadingSpinner } from "components/ui/loading-screen";
import { PERMISSIONS, PERMISSION_MODULES } from "constants/permissions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "components/ui/form";
import { Input } from "components/ui/input";
import { Textarea } from "components/ui/textarea";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useCallback } from "react";      
import { useWatch } from "react-hook-form";

const formSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const form = useForm({ resolver: zodResolver(formSchema), defaultValues: { permissions: [] } });
const selectedPerms = useWatch({ control: form.control, name: "permissions" }) ?? [];


  const load = async () => {
    try {
      const { data } = await axios.get("/api/roles");
      if (data.success) setRoles(data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { form.reset({ code: "", name: "", description: "", permissions: [] }); setEditTarget(null); setFormOpen(true); };

  const openEdit = async (role) => {
    const { data } = await axios.get(`/api/roles/${role.id}`);
    if (data.success) {
      form.reset({
        code: data.data.code,
        name: data.data.name,
        description: data.data.description ?? "",
        permissions: data.data.permissions.map((p) => p.code),
      });
    }
    setEditTarget(role);
    setFormOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      if (editTarget) {
        
        await axios.patch(`/api/roles/${editTarget.id}`, values);
        toast.success("อัพเดทบทบาทสำเร็จ");
        
      } else {
        await axios.post("/api/roles", values);
        toast.success("สร้างบทบาทสำเร็จ");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`/api/roles/${deleteId}`);
      toast.success("ลบบทบาทสำเร็จ");
      setDeleteId(null);
      load();
    } catch { toast.error("ลบไม่สำเร็จ"); }
    finally { setDeleteLoading(false); }
  };

const togglePermission = useCallback((code) => {
  const current = form.getValues("permissions");
  form.setValue(
    "permissions",
    current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code]
  );
}, [form]);

const toggleModule = useCallback((modulePerms) => {
  const current = form.getValues("permissions");
  const allSelected = modulePerms.every((p) => current.includes(p));
  if (allSelected) {
    form.setValue("permissions", current.filter((c) => !modulePerms.includes(c)));
  } else {
    form.setValue("permissions", Array.from(new Set([...current, ...modulePerms])));
  }
}, [form]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <PageHeader title="บทบาท" description="จัดการบทบาทและสิทธิ์การใช้งาน">
        <PermissionGuard permission={PERMISSIONS.ROLE_CREATE}>
          <Button onClick={openCreate} size="sm">
            <PlusIcon className="size-4 mr-1" /> เพิ่มบทบาท
          </Button>
        </PermissionGuard>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{role.name}</CardTitle>
                  <Badge variant="outline" className="mt-1 text-xs">{role.code}</Badge>
                </div>
                <div className="flex gap-1">
                  <PermissionGuard permission={PERMISSIONS.ROLE_UPDATE}>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(role)}>
                      <PencilIcon className="size-3.5" />
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard permission={PERMISSIONS.ROLE_DELETE}>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteId(role.id)}>
                      <TrashIcon className="size-3.5" />
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{role.description ?? "-"}</p>
              <p className="text-xs mt-2 font-medium">{role.permission_count} สิทธิ์</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "แก้ไขบทบาท" : "เพิ่มบทบาท"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel>รหัสบทบาท *</FormLabel><FormControl><Input placeholder="MANAGER" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>ชื่อบทบาท *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>คำอธิบาย</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div>
                <p className="text-sm font-medium mb-3">สิทธิ์การใช้งาน</p>
                <div className="space-y-4">
                  {PERMISSION_MODULES.map((mod) => {
                    const allSelected = mod.permissions.every((p) => selectedPerms.includes(p));
                    return (
                      <div key={mod.module} className="border rounded-lg p-3">
                        <label className="flex items-center gap-2 mb-2 cursor-pointer">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => toggleModule(mod.permissions)}
                          />
                          <span className="text-sm font-medium">{mod.label}</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1 ml-6">
                          {mod.permissions.map((p) => (
                            <label key={p} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={selectedPerms.includes(p)}
                                onCheckedChange={() => togglePermission(p)}
                              />
                              <span className="text-xs text-muted-foreground">{p.replace(/_/g, " ")}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
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

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="ลบบทบาท" description="ต้องการลบบทบาทนี้หรือไม่?" onConfirm={handleDelete} loading={deleteLoading} />
    </div>
  );
}
