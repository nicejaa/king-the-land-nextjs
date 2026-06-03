"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "components/ui/button";
import {
  ShieldXIcon, ArrowLeftIcon, HomeIcon, UserIcon,
} from "lucide-react";

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  PROJECT_MANAGER: "Project Manager",
  SITE_ENGINEER: "Site Engineer",
  FOREMAN: "Foreman",
  QA: "QA",
  PROCUREMENT: "Procurement",
  CONTRACTOR_OWNER: "Contractor Owner",
};

export default function ForbiddenPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="size-28 rounded-full bg-red-100 flex items-center justify-center shadow-inner">
              <ShieldXIcon className="size-14 text-red-500" />
            </div>
            <div className="absolute -top-1 -right-1 size-8 bg-red-500 rounded-full flex items-center justify-center shadow">
              <span className="text-white text-xs font-black">!</span>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <p className="text-red-400 font-bold text-sm tracking-widest uppercase">Error 403</p>
          <h1 className="text-3xl font-bold text-gray-900">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            บัญชีของคุณไม่ได้รับอนุญาตให้เข้าถึงหน้านี้
            <br />กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เพิ่มเติม
          </p>
        </div>

        {/* User info card */}
        {user && (
          <div className="bg-white border border-red-100 rounded-xl px-5 py-4 shadow-sm text-left space-y-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">บัญชีที่ล็อกอินอยู่</p>
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserIcon className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-400">
                  {ROLE_LABELS[user.role] ?? user.role}
                  {user.role && <span className="ml-1 text-gray-300">·</span>}
                  <span className="ml-1 text-red-400 font-medium">ไม่มีสิทธิ์เข้าหน้านี้</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" className="gap-2" onClick={() => router.back()}>
            <ArrowLeftIcon className="size-4" /> กลับหน้าก่อน
          </Button>
          <Button className="gap-2" onClick={() => router.push("/dashboard")}>
            <HomeIcon className="size-4" /> ไปหน้าหลัก
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-gray-400">
          ต้องการสิทธิ์เพิ่มเติม? ติดต่อผู้ดูแลระบบ (Admin)
        </p>
      </div>
    </div>
  );
}
