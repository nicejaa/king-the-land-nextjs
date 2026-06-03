"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "components/ui/card";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "components/ui/form";
import { LoadingSpinner } from "components/ui/loading-screen";
import { HardHatIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { siteConfig } from "config/site";

const loginSchema = z.object({
  username: z.string().min(1, "กรุณากรอก Username"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const ROLE_REDIRECT = {
    SUPER_ADMIN:       "/dashboard",
    PROJECT_MANAGER:   "/dashboard",
    SITE_ENGINEER:     "/dashboard",
    OWNER:             "/dashboard",
    CONTRACTOR:        "/tasks",
    CONTRACTOR_OWNER:  "/tasks",
    QA:                "/daily-logs",
    FOREMAN:           "/daily-logs",
    CRAFTSMAN:         "/tasks",
  };

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (values) => {
    try {
      const result = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      toast.success("เข้าสู่ระบบสำเร็จ");
      const session = await getSession();
      const role = session?.user?.role;
      const dest = ROLE_REDIRECT[role] ?? "/dashboard";
      router.push(dest);
      router.refresh();
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="w-full max-w-md px-4">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <HardHatIcon className="size-6" />
        </div>
        <h1 className="text-2xl font-bold">{siteConfig.name}</h1>
        <p className="text-muted-foreground text-sm">{siteConfig.description}</p>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">เข้าสู่ระบบ</CardTitle>
          <CardDescription>
            กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมล</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="admin@example.com"
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสผ่าน</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOffIcon className="size-4" />
                          ) : (
                            <EyeIcon className="size-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <LoadingSpinner className="mr-2" />
                )}
                เข้าสู่ระบบ
              </Button>
            </form>
          </Form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo: admin@example.com / Admin123!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
