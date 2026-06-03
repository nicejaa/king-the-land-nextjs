"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { PageHeader } from "components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { Button } from "components/ui/button";
import { Avatar, AvatarFallback } from "components/ui/avatar";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "components/ui/form";
import { Input } from "components/ui/input";
import { LoadingSpinner } from "components/ui/loading-screen";
import { Separator } from "components/ui/separator";
import { ROLE_LABELS } from "constants/roles";
import { getInitials } from "lib/utils";

const profileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "อย่างน้อย 8 ตัวอักษร"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirm"],
  });

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user;

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: user?.name?.split(" ")[0] ?? "", last_name: user?.name?.split(" ")[1] ?? "", phone: "" },
  });

  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });

  const onProfileSubmit = async (values) => {
    try {
      await axios.patch(`/api/users/${user?.id}`, values);
      toast.success("อัพเดทโปรไฟล์สำเร็จ");
    } catch (err) { toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด"); }
  };

  const onPasswordSubmit = async (values) => {
    try {
      await axios.patch(`/api/users/${user?.id}`, { password: values.password });
      toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
      passwordForm.reset();
    } catch (err) { toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด"); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="โปรไฟล์" description="จัดการข้อมูลส่วนตัวของคุณ" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-xl">
                {getInitials(user?.name ?? user?.username ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{user?.name ?? "-"}</p>
              <p className="text-sm text-muted-foreground">{user?.username}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ROLE_LABELS[user?.role] ?? user?.role}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={profileForm.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel>ชื่อ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={profileForm.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel>นามสกุล</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={profileForm.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>เบอร์โทร</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end">
                <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                  {profileForm.formState.isSubmitting && <LoadingSpinner className="mr-2" />}
                  บันทึก
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">เปลี่ยนรหัสผ่าน</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField control={passwordForm.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>รหัสผ่านใหม่</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirm" render={({ field }) => (
                <FormItem><FormLabel>ยืนยันรหัสผ่าน</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end">
                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting && <LoadingSpinner className="mr-2" />}
                  เปลี่ยนรหัสผ่าน
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
