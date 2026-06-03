"use client";

import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PageHeader } from "components/ui/page-header";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { LoadingScreen } from "components/ui/loading-screen";
import { EmptyState } from "components/ui/empty-state";
import { useDataTable } from "hooks/use-data-table";
import { formatDateTime } from "lib/utils";
import {
  BellIcon, CheckCheckIcon, ClipboardListIcon,
  AlertTriangleIcon, MessageSquareIcon,
} from "lucide-react";
import { cn } from "lib/utils";

const TYPE_ICON = {
  task:    { icon: ClipboardListIcon, color: "bg-blue-100 text-blue-600" },
  defect:  { icon: AlertTriangleIcon, color: "bg-orange-100 text-orange-600" },
  comment: { icon: MessageSquareIcon, color: "bg-purple-100 text-purple-600" },
  info:    { icon: BellIcon,          color: "bg-gray-100 text-gray-500" },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { data, loading, refresh } = useDataTable("/api/notifications", {}, 50);

  const handleClick = async (n) => {
    if (!n.is_read) {
      try { await axios.patch(`/api/notifications/${n.id}/read`); refresh(); }
      catch { toast.error("เกิดข้อผิดพลาด"); }
    }
    if (n.link) router.push(n.link);
  };

  const markAllRead = async () => {
    try {
      await axios.patch("/api/notifications/read-all");
      toast.success("อ่านทั้งหมดแล้ว");
      refresh();
    } catch { toast.error("เกิดข้อผิดพลาด"); }
  };

  const unreadCount = data.filter((n) => !n.is_read).length;

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-4">
      <PageHeader title="การแจ้งเตือน" description={`${unreadCount} รายการที่ยังไม่ได้อ่าน`}>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheckIcon className="size-4 mr-1" /> อ่านทั้งหมด
          </Button>
        )}
      </PageHeader>

      {data.length === 0 ? (
        <EmptyState icon={BellIcon} title="ไม่มีการแจ้งเตือน" description="คุณไม่มีการแจ้งเตือนใหม่" />
      ) : (
        <div className="space-y-2">
          {data.map((n) => {
            const cfg = TYPE_ICON[n.type] ?? TYPE_ICON.info;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                  n.link ? "cursor-pointer hover:bg-muted/50" : "",
                  !n.is_read ? "bg-primary/5 border-primary/20" : "opacity-70"
                )}
                onClick={() => handleClick(n)}
              >
                <div className={cn("size-9 rounded-full flex items-center justify-center shrink-0", cfg.color)}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm leading-snug", !n.is_read && "font-semibold")}>
                      {n.title ?? n.message}
                    </p>
                    {!n.is_read && <Badge variant="default" className="text-[10px] px-1.5 shrink-0">ใหม่</Badge>}
                  </div>
                  {n.title && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
