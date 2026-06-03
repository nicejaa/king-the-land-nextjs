"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import Link from "next/link";
import {
  FolderKanbanIcon, ClipboardListIcon, AlertTriangleIcon,
  ShoppingCartIcon, BookOpenIcon, ArrowRightIcon, UsersIcon,
  HardHatIcon, CheckCircle2Icon, CircleIcon, ClockIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { PageHeader } from "components/ui/page-header";
import { LoadingScreen } from "components/ui/loading-screen";
import { StatusBadge } from "components/ui/status-badge";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { Progress } from "components/ui/progress";
import { formatCurrency, formatDate } from "lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

const STATUS_LABELS = { PENDING: "รอดำเนินการ", IN_PROGRESS: "กำลังทำ", DONE: "เสร็จแล้ว", CANCELLED: "ยกเลิก" };
const PROJECT_STATUS_LABELS = { PLANNING: "วางแผน", ACTIVE: "ดำเนินการ", ON_HOLD: "หยุดชั่วคราว", COMPLETED: "เสร็จสิ้น", CANCELLED: "ยกเลิก" };

function StatCard({ title, value, icon: Icon, description }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-md p-2 bg-primary/10"><Icon className="size-4 text-primary" /></div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

/* ─── SUPER ADMIN / SITE_ENGINEER ─── */
function DashboardAdmin() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios.get("/api/dashboard/stats").then(({ data }) => { if (data.success) setStats(data.data); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;
  const taskStatusData = stats?.taskByStatus ? Object.entries(stats.taskByStatus).map(([name, value]) => ({ name, value: Number(value) })) : [];
  const defectStatusData = stats?.defectByStatus ? Object.entries(stats.defectByStatus).map(([name, value]) => ({ name, value: Number(value) })) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="ภาพรวมระบบบริหารการก่อสร้าง" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="โครงการทั้งหมด" value={stats?.totalProjects ?? 0} icon={FolderKanbanIcon} description={`${stats?.activeProjects ?? 0} กำลังดำเนินการ`} />
        <StatCard title="งานทั้งหมด" value={stats?.totalTasks ?? 0} icon={ClipboardListIcon} description={`${stats?.pendingTasks ?? 0} รอดำเนินการ`} />
        <StatCard title="ข้อบกพร่องค้างอยู่" value={stats?.openDefects ?? 0} icon={AlertTriangleIcon} description={`${stats?.criticalDefects ?? 0} วิกฤต`} />
        <StatCard title="PR รออนุมัติ" value={stats?.pendingPRs ?? 0} icon={ShoppingCartIcon} description="ใบขอซื้อ" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">สถานะงาน</CardTitle></CardHeader>
          <CardContent>
            {taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={taskStatusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
                  <Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">ไม่มีข้อมูล</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">สรุปข้อบกพร่อง</CardTitle></CardHeader>
          <CardContent>
            {defectStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={defectStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {defectStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">ไม่มีข้อมูล</div>}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">โครงการล่าสุด</CardTitle></CardHeader>
          <CardContent>
            {stats?.recentProjects?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentProjects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-xs text-muted-foreground">{formatCurrency(p.budget)}</p></div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">ข้อบกพร่องล่าสุด</CardTitle></CardHeader>
          <CardContent>
            {stats?.recentDefects?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentDefects.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{d.title}</p><p className="text-xs text-muted-foreground">{d.severity}</p></div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── PROJECT MANAGER ─── */
function DashboardPM({ name }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get("/api/projects?limit=50"),
      axios.get("/api/tasks?limit=100"),
    ]).then(([pRes, tRes]) => {
      setProjects(pRes.data.data ?? []);
      setTasks(tRes.data.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const pendingTasks = tasks.filter((t) => t.status === "PENDING").length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`สวัสดี, ${name} 👷`}
        description="ภาพรวมโครงการที่คุณรับผิดชอบ"
        action={
          <Button size="sm" asChild><Link href="/projects"><FolderKanbanIcon className="size-4 mr-1" />ดูโครงการทั้งหมด</Link></Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="โครงการของฉัน" value={projects.length} icon={FolderKanbanIcon} description={`${projects.filter(p => p.status === "ACTIVE").length} กำลังดำเนินการ`} />
        <StatCard title="งานทั้งหมด" value={totalTasks} icon={ClipboardListIcon} description={`${pendingTasks} รอดำเนินการ`} />
        <StatCard title="กำลังดำเนินการ" value={inProgressTasks} icon={ClockIcon} description="งานที่กำลังทำ" />
        <StatCard title="เสร็จแล้ว" value={doneTasks} icon={CheckCircle2Icon} description={`${overallProgress}% ของงานทั้งหมด`} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">ความคืบหน้าโดยรวม</span>
          <span className="text-muted-foreground">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">โครงการของฉัน</h2>
        {projects.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีโครงการที่ได้รับมอบหมาย</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const pTasks = tasks.filter((t) => t.project_id === p.id);
              const pDone = pTasks.filter((t) => t.status === "DONE").length;
              const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold line-clamp-2">{p.name}</CardTitle>
                        <Badge variant="outline" className="text-xs shrink-0">{PROJECT_STATUS_LABELS[p.status] ?? p.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{pTasks.length} งาน</span>
                        <span>{pPct}%</span>
                      </div>
                      <Progress value={pPct} className="h-1.5" />
                      {p.budget && <p className="text-xs text-muted-foreground">งบ {formatCurrency(p.budget)}</p>}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">งานล่าสุด</CardTitle>
          <Button size="sm" variant="ghost" asChild><Link href="/tasks">ดูทั้งหมด <ArrowRightIcon className="size-3 ml-1" /></Link></Button>
        </CardHeader>
        <CardContent>
          {tasks.slice(0, 8).length === 0 ? <p className="text-sm text-muted-foreground">ไม่มีงาน</p> : (
            <div className="space-y-2">
              {tasks.slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.project_name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{STATUS_LABELS[t.status] ?? t.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── CONTRACTOR OWNER ─── */
function DashboardContractor({ name }) {
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get("/api/tasks?limit=100"),
      axios.get("/api/users?limit=100"),
      axios.get("/api/daily-logs?limit=10"),
    ]).then(([tRes, uRes, lRes]) => {
      setTasks(tRes.data.data ?? []);
      setTeam(uRes.data.data ?? []);
      setLogs(lRes.data.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  const pending = tasks.filter((t) => t.status === "PENDING").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const done = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="space-y-6">
      <PageHeader title={`สวัสดี, ${name} 🏗️`} description="งานที่ผู้รับเหมาของคุณได้รับมอบหมาย" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="งานทั้งหมด" value={tasks.length} icon={ClipboardListIcon} description="ที่ได้รับมอบหมาย" />
        <StatCard title="กำลังดำเนินการ" value={inProgress} icon={ClockIcon} />
        <StatCard title="เสร็จแล้ว" value={done} icon={CheckCircle2Icon} />
        <StatCard title="สมาชิกในทีม" value={team.length} icon={UsersIcon} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">งานที่ต้องทำ</CardTitle>
            <Button size="sm" variant="ghost" asChild><Link href="/tasks">ดูทั้งหมด <ArrowRightIcon className="size-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            {tasks.filter(t => t.status !== "DONE" && t.status !== "CANCELLED").slice(0, 8).length === 0
              ? <p className="text-sm text-muted-foreground">ไม่มีงานค้าง</p>
              : (
                <div className="space-y-2">
                  {tasks.filter(t => t.status !== "DONE" && t.status !== "CANCELLED").slice(0, 8).map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.project_name} · {t.assigned_to_name ?? "ยังไม่ assign"}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{STATUS_LABELS[t.status] ?? t.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">บันทึกล่าสุดของทีม</CardTitle>
            <Button size="sm" variant="ghost" asChild><Link href="/daily-logs">ดูทั้งหมด <ArrowRightIcon className="size-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? <p className="text-sm text-muted-foreground">ยังไม่มีบันทึก</p> : (
              <div className="space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{l.created_by_name}</p>
                      <p className="text-xs text-muted-foreground">{l.project_name} · {formatDate(l.log_date)}</p>
                    </div>
                    {l.manpower_count && <span className="text-xs text-muted-foreground shrink-0">{l.manpower_count} คน</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── QA / FOREMAN / CRAFTSMAN ─── */
function DashboardWorker({ name, role }) {
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get("/api/my-tasks?limit=50"),
      axios.get("/api/daily-logs?limit=5"),
    ]).then(([tRes, lRes]) => {
      setTasks(tRes.data.data ?? []);
      setLogs(lRes.data.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  const pending = tasks.filter((t) => t.status === "PENDING").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;

  const ROLE_LABEL = { QA: "QA Inspector", FOREMAN: "Foreman", CRAFTSMAN: "ช่างฝีมือ" };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`สวัสดี, ${name} 👋`}
        description={ROLE_LABEL[role] ?? role}
        action={
          <Button size="sm" asChild><Link href="/daily-logs"><BookOpenIcon className="size-4 mr-1" />บันทึกประจำวัน</Link></Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="งานของฉัน" value={tasks.length} icon={ClipboardListIcon} />
        <StatCard title="รอดำเนินการ" value={pending} icon={CircleIcon} />
        <StatCard title="กำลังทำ" value={inProgress} icon={ClockIcon} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">งานของฉัน</CardTitle>
            <Button size="sm" variant="ghost" asChild><Link href="/my-tasks">ดูทั้งหมด <ArrowRightIcon className="size-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? <p className="text-sm text-muted-foreground">ยังไม่มีงานที่ได้รับมอบหมาย</p> : (
              <div className="space-y-2">
                {tasks.filter(t => t.status !== "DONE").slice(0, 8).map((t) => (
                  <Link key={t.id} href={`/my-tasks/${t.id}`} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0 hover:bg-muted/40 rounded px-1 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.project_name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{STATUS_LABELS[t.status] ?? t.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">บันทึกล่าสุดของฉัน</CardTitle>
            <Button size="sm" asChild><Link href="/daily-logs"><BookOpenIcon className="size-3.5 mr-1" />บันทึกใหม่</Link></Button>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? <p className="text-sm text-muted-foreground">ยังไม่มีบันทึก</p> : (
              <div className="space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{formatDate(l.log_date)}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.note || l.project_name}</p>
                    </div>
                    {l.manpower_count && <span className="text-xs text-muted-foreground shrink-0">{l.manpower_count} คน</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── MAIN ─── */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return <LoadingScreen />;

  const role = session?.user?.role;
  const name = session?.user?.name || "คุณ";

  if (role === "PROJECT_MANAGER") return <DashboardPM name={name} />;
  if (role === "CONTRACTOR_OWNER" || role === "CONTRACTOR") return <DashboardContractor name={name} />;
  if (role === "QA" || role === "FOREMAN" || role === "CRAFTSMAN") return <DashboardWorker name={name} role={role} />;
  return <DashboardAdmin />;
}
