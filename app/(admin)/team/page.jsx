"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "components/ui/page-header";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import { Badge } from "components/ui/badge";
import { useDebounce } from "hooks/use-debounce";
import { useDataTable } from "hooks/use-data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "components/ui/select";
import { PlusIcon, HardHatIcon, UserIcon } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "FOREMAN",   label: "Foreman (ช่างหัวหน้า)" },
  { value: "QA",        label: "QA Inspector (ผู้ตรวจสอบ)" },
  { value: "CRAFTSMAN", label: "Craftsman (ช่างฝีมือ)" },
];

const ROLE_BADGE = {
  FOREMAN:   "bg-orange-100 text-orange-700",
  QA:        "bg-purple-100 text-purple-700",
  CRAFTSMAN: "bg-blue-100 text-blue-700",
};

const schema = z.object({
  first_name: z.string().min(1, "กรุณากรอกชื่อ"),
  last_name:  z.string().min(1, "กรุณากรอกนามสกุล"),
  username:   z.string().min(3, "กรุณากรอก username (ขั้นต่ำ 3 ตัว)"),
  password:   z.string().min(8, "รหัสผ่านขั้นต่ำ 8 ตัว"),
  phone:      z.string().optional(),
  role:       z.enum(["FOREMAN", "QA", "CRAFTSMAN"]),
});

export default function TeamPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const { data: members, loading, refresh } = useDataTable("/api/users", { search: debouncedSearch }, 100);

  const [open, setOpen] = useState(false);
  const form = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    try {
      await axios.post("/api/users", values);
      toast.success("เพิ่มสมาชิกทีมสำเร็จ");
      setOpen(false);
      form.reset();
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="ทีมของฉัน" description="จัดการสมาชิกในทีม — Foreman, QA, Craftsman">
        <Button size="sm" onClick={() => { form.reset({ role: "FOREMAN" }); setOpen(true); }}>
          <PlusIcon className="size-4 mr-1" /> เพิ่มสมาชิก
        </Button>
      </PageHeader>

      <Input
        placeholder="ค้นหาชื่อ หรือ username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 w-64"
      />

      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_130px_100px] gap-2 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground border-b">
          <span>ชื่อ - Username</span>
          <span>บทบาท</span>
          <span>เบอร์โทร</span>
          <span>สถานะ</span>
        </div>

        {loading && (
          <div className="py-10 text-center text-muted-foreground text-sm">กำลังโหลด...</div>
        )}
        {!loading && members.length === 0 && (
          <div className="py-10 text-center text-muted-foreground text-sm">
            ยังไม่มีสมาชิกในทีม — กด <strong>เพิ่มสมาชิก</strong> เพื่อเริ่มต้น
          </div>
        )}
        {!loading && members.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr_120px_130px_100px] gap-2 px-4 py-3 border-b items-center text-sm hover:bg-muted/30 transition-colors">
            <span className="flex items-center gap-2">
              <UserIcon className="size-4 text-muted-foreground shrink-0" />
              <span>
                <span className="font-medium">{m.first_name} {m.last_name}</span>
                <span className="ml-2 text-xs text-muted-foreground">@{m.username}</span>
              </span>
            </span>
            <span>
              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[m.role] ?? "bg-muted text-muted-foreground"}`}>
                <HardHatIcon className="size-3" />
                {ROLE_OPTIONS.find((r) => r.value === m.role)?.label ?? m.role}
              </span>
            </span>
            <span className="text-muted-foreground text-xs">{m.phone ?? "—"}</span>
            <span>
              <Badge variant={m.is_active ? "default" : "secondary"} className="text-xs">
                {m.is_active ? "ใช้งาน" : "ปิดใช้"}
              </Badge>
            </span>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มสมาชิกทีม</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel>ชื่อ *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel>นามสกุล *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem><FormLabel>Username *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>รหัสผ่าน *</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>เบอร์โทร</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>บทบาท *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>เพิ่มสมาชิก</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
