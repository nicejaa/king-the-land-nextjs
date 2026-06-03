"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "components/ui/page-header";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import { Badge } from "components/ui/badge";
import { PermissionGuard } from "components/guards/PermissionGuard";
import { PERMISSIONS } from "constants/permissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "components/ui/form";
import { ArrowLeftIcon, PlusIcon, UserIcon, BuildingIcon, PhoneIcon, MailIcon } from "lucide-react";

const ownerSchema = z.object({
  first_name: z.string().min(1, "กรุณากรอกชื่อ"),
  last_name:  z.string().min(1, "กรุณากรอกนามสกุล"),
  username:   z.string().min(3, "กรุณากรอก username (ขั้นต่ำ 3 ตัว)"),
  password:   z.string().min(8, "รหัสผ่านขั้นต่ำ 8 ตัว"),
  phone:      z.string().optional(),
});

export default function ContractorDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [contractor, setContractor] = useState(null);
  const [owners, setOwners] = useState([]);
  const [loadingContractor, setLoadingContractor] = useState(true);
  const [loadingOwners, setLoadingOwners] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const form = useForm({ resolver: zodResolver(ownerSchema) });

  const fetchContractor = async () => {
    try {
      const { data: res } = await axios.get(`/api/contractors/${id}`);
      if (res.success) setContractor(res.data);
    } catch { toast.error("โหลดข้อมูลผู้รับเหมาไม่สำเร็จ"); }
    finally { setLoadingContractor(false); }
  };

  const fetchOwners = async () => {
    setLoadingOwners(true);
    try {
      const { data: res } = await axios.get(`/api/users?role=CONTRACTOR_OWNER&contractor_id=${id}&limit=100`);
      if (res.success) setOwners(res.data ?? []);
    } catch { toast.error("โหลดข้อมูล Contractor Owner ไม่สำเร็จ"); }
    finally { setLoadingOwners(false); }
  };

  useEffect(() => {
    fetchContractor();
    fetchOwners();
  }, [id]);

  const onSubmit = async (values) => {
    try {
      await axios.post("/api/users", {
        ...values,
        role: "CONTRACTOR_OWNER",
        contractor_id: id,
      });
      toast.success("สร้าง Contractor Owner สำเร็จ");
      setFormOpen(false);
      form.reset();
      fetchOwners();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด");
    }
  };

  if (loadingContractor) {
    return <div className="py-20 text-center text-muted-foreground text-sm">กำลังโหลด...</div>;
  }

  if (!contractor) {
    return <div className="py-20 text-center text-destructive text-sm">ไม่พบข้อมูลผู้รับเหมา</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={contractor.company_name}
        description="รายละเอียดผู้รับเหมา และ Contractor Owner ที่อยู่ภายใต้"
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/contractors")}>
            <ArrowLeftIcon className="size-4 mr-1" /> กลับ
          </Button>
          <PermissionGuard permission={PERMISSIONS.USER_CREATE}>
            <Button size="sm" onClick={() => { form.reset(); setFormOpen(true); }}>
              <PlusIcon className="size-4 mr-1" /> เพิ่ม Contractor Owner
            </Button>
          </PermissionGuard>
        </div>
      </PageHeader>

      {/* Contractor Info Card */}
      <div className="rounded-lg border p-5 bg-muted/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="flex items-start gap-2">
          <BuildingIcon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">บริษัท</p>
            <p className="font-medium">{contractor.company_name}</p>
          </div>
        </div>
        {contractor.contact_name && (
          <div className="flex items-start gap-2">
            <UserIcon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">ผู้ติดต่อ</p>
              <p className="font-medium">{contractor.contact_name}</p>
            </div>
          </div>
        )}
        {contractor.phone && (
          <div className="flex items-start gap-2">
            <PhoneIcon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">เบอร์โทร</p>
              <p className="font-medium">{contractor.phone}</p>
            </div>
          </div>
        )}
        {contractor.username && (
          <div className="flex items-start gap-2">
            <MailIcon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">อีเมล</p>
              <p className="font-medium">{contractor.username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Contractor Owners */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-foreground">Contractor Owner ({owners.length})</h2>
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_140px_80px] gap-2 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground border-b">
            <span>ชื่อ - Username</span>
            <span>เบอร์โทร</span>
            <span>สร้างเมื่อ</span>
            <span>สถานะ</span>
          </div>

          {loadingOwners && (
            <div className="py-8 text-center text-muted-foreground text-sm">กำลังโหลด...</div>
          )}
          {!loadingOwners && owners.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              ยังไม่มี Contractor Owner — กดปุ่ม <strong>เพิ่ม Contractor Owner</strong> ด้านบน
            </div>
          )}
          {!loadingOwners && owners.map((u) => (
            <div key={u.id} className="grid grid-cols-[1fr_140px_140px_80px] gap-2 px-4 py-3 border-b items-center text-sm hover:bg-muted/30 transition-colors">
              <span className="flex items-center gap-2">
                <UserIcon className="size-4 text-muted-foreground shrink-0" />
                <span>
                  <span className="font-medium">{u.first_name} {u.last_name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">@{u.username}</span>
                </span>
              </span>
              <span className="text-muted-foreground text-xs">{u.phone ?? "—"}</span>
              <span className="text-muted-foreground text-xs">
                {u.created_at ? new Date(u.created_at).toLocaleDateString("th-TH") : "—"}
              </span>
              <span>
                <Badge variant={u.is_active ? "default" : "secondary"} className="text-xs">
                  {u.is_active ? "ใช้งาน" : "ปิดใช้"}
                </Badge>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add CONTRACTOR_OWNER Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่ม Contractor Owner — {contractor.company_name}</DialogTitle>
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
                <FormItem><FormLabel>รหัสผ่าน * (ขั้นต่ำ 8 ตัว)</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>เบอร์โทร</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                User นี้จะได้รับบทบาท <strong>Contractor Owner</strong> และจะถูกผูกกับ <strong>{contractor.company_name}</strong> โดยอัตโนมัติ
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>ยกเลิก</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>สร้าง</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
