"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "components/ui/page-header";
import { StatusBadge } from "components/ui/status-badge";
import { Button } from "components/ui/button";
import { LoadingScreen } from "components/ui/loading-screen";
import { Progress } from "components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "components/ui/select";
import { formatDate, formatCurrency } from "lib/utils";
import {
  ArrowLeftIcon,
  CalendarIcon,
  UsersIcon,
  ClipboardListIcon,
  AlertTriangleIcon,
  BanknoteIcon,
  UserIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";

const STATUS_LABELS = {
  PLANNING: "วางแผน",
  ACTIVE: "ดำเนินการ",
  ON_HOLD: "หยุดชั่วคราว",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

function StatCard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex items-center gap-4">
      <div className={`rounded-md p-2 bg-muted ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-3 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm font-medium">{children ?? "—"}</span>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [allPMs, setAllPMs] = useState([]);
  const [selectedPM, setSelectedPM] = useState("");
  const [addingPM, setAddingPM] = useState(false);

  const fetchMembers = useCallback(() => {
    axios.get(`/api/projects/${id}/members`).then(({ data }) => setMembers(data.data ?? [])).catch(() => {});
  }, [id]);

  useEffect(() => {
    axios
      .get(`/api/projects/${id}`)
      .then(({ data }) => setProject(data.data))
      .catch(() => router.replace("/projects"))
      .finally(() => setLoading(false));
    fetchMembers();
    if (isSuperAdmin) {
      axios.get("/api/users?limit=200").then(({ data }) => {
        const pms = (data.data ?? []).filter((u) => u.role === "PROJECT_MANAGER");
        setAllPMs(pms);
      }).catch(() => {});
    }
  }, [id, isSuperAdmin]);

  const addPM = async () => {
    if (!selectedPM) return;
    setAddingPM(true);
    try {
      await axios.post(`/api/projects/${id}/members`, { user_id: selectedPM, role: "PROJECT_MANAGER" });
      toast.success("เพิ่ม PM สำเร็จ");
      setSelectedPM("");
      fetchMembers();
    } catch { toast.error("เพิ่มไม่สำเร็จ"); }
    finally { setAddingPM(false); }
  };

  const removePM = async (userId) => {
    try {
      await axios.delete(`/api/projects/${id}/members?user_id=${userId}`);
      toast.success("ลบ PM สำเร็จ");
      fetchMembers();
    } catch { toast.error("ลบไม่สำเร็จ"); }
  };

  if (loading) return <LoadingScreen />;
  if (!project) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description || "ไม่มีคำอธิบาย"}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">
                <ArrowLeftIcon className="size-4 mr-1" />
                กลับ
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={ClipboardListIcon} label="งานทั้งหมด" value={project.task_count ?? 0} color="text-blue-600" />
        <StatCard icon={BanknoteIcon} label="งบ WBS รวม" value={formatCurrency(Number(project.tasks_budget ?? 0))} color="text-violet-600" />
        <StatCard icon={AlertTriangleIcon} label="ข้อบกพร่อง" value={project.defect_count ?? 0} color="text-red-500" />
        <StatCard icon={UsersIcon} label="สมาชิก" value={project.member_count ?? 0} color="text-green-600" />
      </div>

      {/* Budget usage bar */}
      {Number(project.tasks_budget ?? 0) > 0 && (() => {
        const budget  = Number(project.tasks_budget);
        const actual  = Number(project.tasks_actual_cost ?? 0);
        const pct     = Math.min(Math.round((actual / budget) * 100), 100);
        const over    = actual > budget;
        return (
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">การใช้งบประมาณ (WBS)</span>
              <span className={over ? "text-destructive font-medium" : "text-muted-foreground"}>
                {formatCurrency(actual)} / {formatCurrency(budget)}
                {over && <span className="ml-1 text-xs">(เกินงบ)</span>}
              </span>
            </div>
            <Progress value={pct} className={`h-2.5 ${over ? "[&>div]:bg-destructive" : ""}`} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>ใช้ไปแล้ว {pct}%</span>
              <span>คงเหลือ {formatCurrency(Math.max(budget - actual, 0))}</span>
            </div>
          </div>
        );
      })()}

      {/* Detail card */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">ข้อมูลโครงการ</h2>
        <InfoRow label="สถานะ">
          <StatusBadge status={project.status} label={STATUS_LABELS[project.status]} />
        </InfoRow>
        <InfoRow label="งบประมาณ">
          {project.budget ? formatCurrency(project.budget) : "—"}
        </InfoRow>
        <InfoRow label="วันเริ่มต้น">
          <span className="flex items-center gap-1">
            <CalendarIcon className="size-3.5 text-muted-foreground" />
            {project.start_date ? formatDate(project.start_date) : "—"}
          </span>
        </InfoRow>
        <InfoRow label="วันสิ้นสุด">
          <span className="flex items-center gap-1">
            <CalendarIcon className="size-3.5 text-muted-foreground" />
            {project.end_date ? formatDate(project.end_date) : "—"}
          </span>
        </InfoRow>
        <InfoRow label="สร้างโดย">
          <span className="flex items-center gap-1">
            <UserIcon className="size-3.5 text-muted-foreground" />
            {project.created_by_name || "—"}
          </span>
        </InfoRow>
        <InfoRow label="วันที่สร้าง">
          {formatDate(project.created_at)}
        </InfoRow>
      </div>

      {/* PM Assignment — SuperAdmin only */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Project Manager ที่รับผิดชอบ</h2>
          <span className="text-xs text-muted-foreground">{members.length} คน</span>
        </div>

        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">ยังไม่มี PM ที่ได้รับมอบหมาย</p>
        )}
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-2">
              <span className="flex items-center gap-2">
                <UserIcon className="size-3.5 text-muted-foreground" />
                {m.name}
                <span className="text-xs text-muted-foreground">{m.username}</span>
              </span>
              {isSuperAdmin && (
                <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => removePM(m.user_id)}>
                  <XIcon className="size-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {isSuperAdmin && (
          <div className="flex gap-2 pt-1">
            <Select value={selectedPM} onValueChange={setSelectedPM}>
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="เลือก PM..." />
              </SelectTrigger>
              <SelectContent>
                {allPMs.filter((u) => !members.find((m) => m.user_id === u.id)).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addPM} disabled={!selectedPM || addingPM}>
              <PlusIcon className="size-4 mr-1" /> มอบ PM
            </Button>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/tasks/${id}`}>
            <ClipboardListIcon className="size-4 mr-1" />
            ดู WBS ({project.task_count ?? 0} งาน)
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/defects?project_id=${id}`}>
            <AlertTriangleIcon className="size-4 mr-1" />
            ดูข้อบกพร่อง ({project.defect_count ?? 0})
          </Link>
        </Button>
      </div>
    </div>
  );
}
