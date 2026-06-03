"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "components/ui/page-header";
import { Button } from "components/ui/button";
import { StatusBadge } from "components/ui/status-badge";
import { Progress } from "components/ui/progress";
import { ConfirmDialog } from "components/ui/confirm-dialog";
import { PermissionGuard } from "components/guards/PermissionGuard";
import { PERMISSIONS } from "constants/permissions";
import { useDebounce } from "hooks/use-debounce";
import { useDataTable } from "hooks/use-data-table";
import { formatCurrency, formatDate } from "lib/utils";
import {
  PlusIcon, PencilIcon, TrashIcon,
  ChevronDownIcon, ChevronRightIcon, FolderIcon, ArrowLeftIcon,
  GripVerticalIcon, ListOrderedIcon, Building2Icon, UserIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "components/ui/form";
import { Input } from "components/ui/input";
import { Textarea } from "components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "components/ui/select";
import { LoadingSpinner } from "components/ui/loading-screen";
import { Checkbox } from "components/ui/checkbox";

const STATUS_OPTIONS = [
  { value: "PENDING",     label: "รอดำเนินการ" },
  { value: "IN_PROGRESS", label: "กำลังดำเนินการ" },
  { value: "DONE",        label: "เสร็จแล้ว" },
  { value: "CANCELLED",   label: "ยกเลิก" },
];
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]));

const schema = z.object({
  title:                 z.string().min(1, "กรุณากรอกชื่อ"),
  wbs_code:              z.string().optional(),
  description:           z.string().optional(),
  status:                z.string().optional(),
  planned_start:         z.string().optional(),
  planned_end:           z.string().optional(),
  budget_cost:           z.coerce.number().optional(),
  progress_percent:      z.coerce.number().min(0).max(100).optional(),
  assigned_to:           z.string().optional(),
  assigned_contractor_id: z.string().optional(),
  assignees:             z.array(z.string()).optional().default([]),
});

const LEVEL_LABELS = { 1: "หมวดหลัก", 2: "หมวดย่อย", 3: "งานย่อย" };
const LEVEL_BG = {
  1: "bg-primary/8 hover:bg-primary/12 font-semibold",
  2: "bg-muted/50 hover:bg-muted/70 font-medium",
  3: "hover:bg-muted/20",
};

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function buildTree(flatTasks) {
  const map = {};
  for (const t of flatTasks) map[t.id] = { ...t, children: [] };
  const roots = [];
  for (const t of flatTasks) {
    if (t.parent_id && map[t.parent_id]) map[t.parent_id].children.push(map[t.id]);
    else roots.push(map[t.id]);
  }
  return roots;
}

function flattenTree(nodes, depth = 0, result = []) {
  for (const n of nodes) {
    result.push({ ...n, depth });
    if (n.children?.length) flattenTree(n.children, depth + 1, result);
  }
  return result;
}

function leafProgress(treeRows, id) {
  const children = treeRows.filter((r) => r.parent_id === id);
  if (!children.length) return [];
  const vals = [];
  for (const c of children) {
    if (Number(c.level) === 3) vals.push(Number(c.progress_percent ?? 0));
    else vals.push(...leafProgress(treeRows, c.id));
  }
  return vals;
}

function nextWbsCode(treeRows, level, parentTask) {
  if (level === 1) {
    const siblings = treeRows.filter((r) => Number(r.level) === 1);
    const max = siblings.reduce((m, r) => {
      const n = parseInt(r.wbs_code ?? "0", 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return String(max + 1).padStart(2, "0");
  }
  const siblings = treeRows.filter((r) => r.parent_id === parentTask?.id);
  const base = parentTask?.wbs_code ?? "00";
  const max = siblings.reduce((m, r) => {
    if (!r.wbs_code) return m;
    const parts = r.wbs_code.split(".");
    const n = parseInt(parts[parts.length - 1], 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `${base}.${String(max + 1).padStart(2, "0")}`;
}

export default function WBSPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isPM = ["SUPER_ADMIN", "SITE_ENGINEER", "PROJECT_MANAGER"].includes(role);
  const isContractorOwner = role === "CONTRACTOR_OWNER";

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(new Set());
  const debouncedSearch = useDebounce(search);
  const [contractors, setContractors] = useState([]);

  const { data, loading, refresh } = useDataTable(
    "/api/tasks", { project_id: projectId, search: debouncedSearch }, 500
  );
  const [projectName, setProjectName] = useState("");
  const [level2Users, setLevel2Users] = useState([]);
  const [level3Users, setLevel3Users] = useState([]);
  const [formLevel, setFormLevel] = useState(1);
  const [formParentId, setFormParentId] = useState(null);
  const [formWbsCode, setFormWbsCode] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderData, setReorderData] = useState([]);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const draggedIdRef = useRef(null);
  const form = useForm({ resolver: zodResolver(schema), shouldUnregister: true });
  const selectedContractor = form.watch("assigned_contractor_id");

  useEffect(() => {
    axios.get(`/api/projects/${projectId}`).then(({ data: res }) => {
      if (res.success) setProjectName(res.data?.name ?? "");
    }).catch(() => {});
    if (isPM) {
      axios.get("/api/contractors?limit=100").then(({ data: res }) => {
        if (res.success) setContractors(res.data ?? []);
      }).catch(() => {});
    }
  }, [projectId, isPM]);

  const treeRows = useMemo(() => flattenTree(buildTree(data)), [data]);
  const reorderRows = useMemo(() => {
    const sorted = [...reorderData].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return flattenTree(buildTree(sorted));
  }, [reorderData]);

  const visibleRows = useMemo(() => {
    return treeRows.filter((row) => {
      if (!row.parent_id) return true;
      let cur = row;
      while (cur.parent_id) {
        if (collapsed.has(cur.parent_id)) return false;
        cur = treeRows.find((r) => r.id === cur.parent_id) ?? { parent_id: null };
      }
      return true;
    });
  }, [treeRows, collapsed]);

  const toggle = (id) => setCollapsed((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const childCount = (id) => treeRows.filter((r) => r.parent_id === id).length;

  const enterReorder = () => {
    const byParent = {};
    for (const r of data) {
      const key = r.parent_id ?? "__root";
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(r);
    }
    const initialized = [];
    for (const group of Object.values(byParent)) {
      group.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
           .forEach((r, i) => initialized.push({ ...r, sort_order: i }));
    }
    setReorderData(initialized);
    setReorderMode(true);
  };

  const onDragStart = (e, row) => {
    draggedIdRef.current = row.id;
    setDraggedId(row.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e, row) => {
    e.preventDefault();
    const dragId = draggedIdRef.current;
    if (!dragId || dragId === row.id) return;
    const draggedParent = reorderData.find((r) => r.id === dragId)?.parent_id ?? null;
    if (draggedParent === (row.parent_id ?? null)) setDragOverId(row.id);
  };

  const onDrop = (e, targetRow) => {
    e.preventDefault();
    const dragId = draggedIdRef.current;
    draggedIdRef.current = null;
    setDraggedId(null); setDragOverId(null);
    if (!dragId || dragId === targetRow.id) return;
    setReorderData((prev) => {
      const dragged = prev.find((r) => r.id === dragId);
      if (!dragged || (dragged.parent_id ?? null) !== (targetRow.parent_id ?? null)) return prev;
      const parentId = dragged.parent_id ?? null;
      const siblings = prev
        .filter((r) => (r.parent_id ?? null) === parentId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const from = siblings.findIndex((r) => r.id === dragId);
      const to   = siblings.findIndex((r) => r.id === targetRow.id);
      if (from === -1 || to === -1) return prev;
      const reordered = [...siblings];
      reordered.splice(to, 0, reordered.splice(from, 1)[0]);
      const next = [...prev];
      reordered.forEach((item, i) => {
        const idx = next.findIndex((r) => r.id === item.id);
        if (idx !== -1) next[idx] = { ...next[idx], sort_order: i };
      });
      return next;
    });
  };

  const saveReorder = async () => {
    setReorderSaving(true);
    try {
      const changed = reorderData.filter((r) => {
        const orig = data.find((d) => d.id === r.id);
        return orig && Number(orig.sort_order) !== r.sort_order;
      });
      await Promise.all(changed.map((r) => axios.patch(`/api/tasks/${r.id}`, { sort_order: r.sort_order })));
      toast.success(`บันทึกลำดับสำเร็จ`);
      setReorderMode(false); refresh();
    } catch { toast.error("บันทึกไม่สำเร็จ"); } finally { setReorderSaving(false); }
  };

  const loadUsersIfNeeded = (level) => {
    if (level === 2 && level2Users.length === 0) {
      axios.get("/api/users?limit=200&role=CONTRACTOR_OWNER").then(({ data: res }) => {
        if (res.success) setLevel2Users(res.data ?? []);
      }).catch(() => {});
    }
    if (level === 3 && level3Users.length === 0) {
      axios.get("/api/users?limit=200&role=FOREMAN,QA,CRAFTSMAN,SITE_ENGINEER,CONTRACTOR").then(({ data: res }) => {
        if (res.success) setLevel3Users(res.data ?? []);
      }).catch(() => {});
    }
  };

  const openCreate = (parentTask = null) => {
    const level = parentTask ? (Number(parentTask.level) || 1) + 1 : 1;
    setFormLevel(level);
    setFormParentId(parentTask?.id ?? null);
    setFormWbsCode(nextWbsCode(treeRows, level, parentTask));
    form.reset({ title: "", description: "", status: "PENDING" });
    setEditTarget(null); setFormOpen(true);
    loadUsersIfNeeded(level);
  };

  const openEdit = (row) => {
    const level = Number(row.level) || 3;
    setFormLevel(level);
    setFormParentId(row.parent_id ?? null);
    setFormWbsCode(row.wbs_code ?? "");
    loadUsersIfNeeded(level);
    form.reset({
      ...row,
      budget_cost: row.budget_cost ?? "",
      assigned_to: row.assigned_to ?? "",
      assigned_contractor_id: row.assigned_contractor_id ?? "",
      assignees: Array.isArray(row.assignees) ? row.assignees.map((a) => a.id ?? a) : [],
    });
    setEditTarget(row); setFormOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = { ...values, project_id: projectId, level: formLevel, parent_id: formParentId || undefined, wbs_code: formWbsCode || undefined };
    if (!payload.assigned_to) delete payload.assigned_to;
    if (!payload.assigned_contractor_id) delete payload.assigned_contractor_id;
    if (!payload.parent_id)   delete payload.parent_id;
    if (formLevel !== 3) delete payload.assignees;
    try {
      if (editTarget) { await axios.patch(`/api/tasks/${editTarget.id}`, payload); toast.success("อัพเดทสำเร็จ"); }
      else { await axios.post("/api/tasks", payload); toast.success("สร้างสำเร็จ"); }
      setFormOpen(false); refresh();
    } catch (err) { toast.error(err.response?.data?.message ?? "เกิดข้อผิดพลาด"); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try { await axios.delete(`/api/tasks/${deleteId}`); toast.success("ลบสำเร็จ"); setDeleteId(null); refresh(); }
    catch { toast.error("ลบไม่สำเร็จ"); } finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={projectName ? `WBS — ${projectName}` : "WBS"}
        description="Work Breakdown Structure: หมวดหลัก → หมวดย่อย → งานย่อย"
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/tasks")}>
            <ArrowLeftIcon className="size-4 mr-1" /> กลับ
          </Button>
          {!isContractorOwner && (
          <PermissionGuard permission={PERMISSIONS.TASK_CREATE}>
            <Button size="sm" onClick={() => openCreate()}>
              <PlusIcon className="size-4 mr-1" /> เพิ่มหมวดหลัก
            </Button>
          </PermissionGuard>
        )}
        </div>
      </PageHeader>

      <div className="flex items-center gap-3 flex-wrap">
        {!reorderMode ? (
          <>
            <Input placeholder="ค้นหางาน..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56" />
            <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set())}>ขยายทั้งหมด</Button>
            <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set(treeRows.filter((r) => Number(r.level) < 3).map((r) => r.id)))}>ย่อทั้งหมด</Button>
            <Button variant="outline" size="sm" onClick={enterReorder}>
              <ListOrderedIcon className="size-4 mr-1" /> ปรับลำดับ
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-primary">โหมดปรับลำดับ — ใช้ ↑ ↓ เพื่อย้าย</span>
            <Button size="sm" onClick={saveReorder} disabled={reorderSaving}>
              {reorderSaving && <LoadingSpinner className="mr-2" />} บันทึกลำดับ
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReorderMode(false)}>ยกเลิก</Button>
          </>
        )}
      </div>

      <div className="rounded-lg border overflow-hidden text-sm">
        <div className="grid grid-cols-[1fr_110px_170px_120px_95px_96px] gap-2 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground border-b">
          <span>ชื่องาน</span><span>สถานะ</span><span>ความคืบหน้า</span><span>งบประมาณ</span><span>กำหนดเสร็จ</span><span></span>
        </div>

        {loading && <div className="py-12 text-center text-muted-foreground">กำลังโหลด...</div>}
        {!loading && visibleRows.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            ยังไม่มีงาน — กด <strong>เพิ่มหมวดหลัก</strong> เพื่อเริ่มต้น
          </div>
        )}

        {!loading && (reorderMode ? reorderRows : visibleRows).map((row) => {
          const lvl = Number(row.level);
          const indent = row.depth * 20 + 16;
          const hasChildren = childCount(row.id) > 0;
          const isCollapsed = collapsed.has(row.id);
          const childBudget = lvl === 1
            ? treeRows.filter((r) => r.parent_id === row.id).reduce((s, r) => s + Number(r.budget_cost ?? 0), 0)
            : lvl === 2 ? Number(row.budget_cost ?? 0) : null;
          const childProgress = lvl < 3 ? avg(leafProgress(treeRows, row.id)) : null;
          const isDragging = reorderMode && draggedId === row.id;
          const isOver    = reorderMode && dragOverId === row.id;

          return (
            <div key={row.id}
              draggable={reorderMode}
              onDragStart={reorderMode ? (e) => onDragStart(e, row) : undefined}
              onDragOver={reorderMode  ? (e) => onDragOver(e, row)  : undefined}
              onDragLeave={reorderMode ? () => setDragOverId(null)   : undefined}
              onDrop={reorderMode      ? (e) => onDrop(e, row)       : undefined}
              onDragEnd={reorderMode   ? () => { setDraggedId(null); setDragOverId(null); } : undefined}
              className={`grid grid-cols-[1fr_110px_170px_120px_95px_96px] gap-2 pr-4 py-2 border-b items-center transition-all
                ${LEVEL_BG[lvl] ?? ""}
                ${isDragging ? "opacity-40" : ""}
                ${isOver ? "border-t-2 border-primary bg-primary/5" : ""}
                ${reorderMode ? "cursor-grab" : ""}`}
              style={{ paddingLeft: indent }}>
              <span className="flex items-center gap-1.5 min-w-0">
                {lvl < 3 && hasChildren ? (
                  <button onClick={() => toggle(row.id)} className="shrink-0">
                    {isCollapsed ? <ChevronRightIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
                  </button>
                ) : <span className="size-3.5 shrink-0" />}
                {lvl === 1 && <FolderIcon className="size-3.5 text-primary shrink-0" />}
                <span className="truncate">
                  {row.wbs_code && <span className="text-muted-foreground mr-1.5 text-xs">{row.wbs_code}</span>}
                  {row.title}
                </span>
                {hasChildren && <span className="text-xs text-muted-foreground shrink-0 ml-1">({childCount(row.id)})</span>}
                {lvl === 1 && row.assigned_contractor_name && (
                  <span className="ml-2 shrink-0 flex items-center gap-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded px-1.5 py-0.5">
                    <Building2Icon className="size-3" />{row.assigned_contractor_name}
                  </span>
                )}
                {lvl === 2 && row.assigned_to_name && (
                  <span className="ml-2 shrink-0 flex items-center gap-1 text-xs bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 rounded px-1.5 py-0.5">
                    <UserIcon className="size-3" />{row.assigned_to_name}
                  </span>
                )}
                {lvl === 3 && Array.isArray(row.assignees) && row.assignees.length > 0 && (
                  <span className="ml-2 shrink-0 flex items-center gap-1 text-xs bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 rounded px-1.5 py-0.5">
                    <UserIcon className="size-3" />{row.assignees.map((a) => a.name ?? a).join(", ")}
                  </span>
                )}
              </span>
              <span>{lvl === 3 ? <StatusBadge status={row.status} label={STATUS_LABELS[row.status]} /> : ""}</span>
              <span className="flex items-center gap-2">
                <Progress value={lvl === 3 ? (row.progress_percent ?? 0) : (childProgress ?? 0)} className="flex-1 h-1.5" />
                <span className="text-xs text-muted-foreground w-8 text-right">{lvl === 3 ? (row.progress_percent ?? 0) : (childProgress ?? 0)}%</span>
              </span>
              <span className="text-xs">
                {lvl === 1 ? (childBudget ? formatCurrency(childBudget) : "—") :
                 lvl === 2 ? (row.budget_cost ? formatCurrency(Number(row.budget_cost)) : "—") : "—"}
              </span>
              <span className="text-xs text-muted-foreground">{lvl === 3 ? formatDate(row.planned_end) : ""}</span>
              <span className="flex gap-0.5 justify-end">
                {reorderMode ? (
                  <GripVerticalIcon className="size-4 text-muted-foreground mx-auto" />
                ) : (
                <>
                {lvl < 3 && (
                  <PermissionGuard permission={PERMISSIONS.TASK_CREATE}>
                    {(lvl < 2 || !isPM) && (
                      <Button size="icon" variant="ghost" className="size-7 text-primary" title={`เพิ่ม${LEVEL_LABELS[lvl + 1]}`} onClick={() => openCreate(row)}>
                        <PlusIcon className="size-3.5" />
                      </Button>
                    )}
                  </PermissionGuard>
                )}
                {!(isPM && lvl === 3) && (
                  <PermissionGuard permission={PERMISSIONS.TASK_UPDATE}>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(row)}><PencilIcon className="size-3.5" /></Button>
                  </PermissionGuard>
                )}
                {!(isPM && lvl === 3) && (
                  <PermissionGuard permission={PERMISSIONS.TASK_DELETE}>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteId(row.id)}><TrashIcon className="size-3.5" /></Button>
                  </PermissionGuard>
                )}
                </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "แก้ไข" : "เพิ่ม"}{LEVEL_LABELS[formLevel]}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>ชื่อ{LEVEL_LABELS[formLevel]} *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {formWbsCode && (
                <p className="text-xs text-muted-foreground">รหัส WBS: <span className="font-mono font-medium text-foreground">{formWbsCode}</span></p>
              )}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>คำอธิบาย</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              {formLevel === 2 && (
                <>
                  <FormField control={form.control} name="budget_cost" render={({ field }) => (
                    <FormItem><FormLabel>งบประมาณ (บาท)</FormLabel><FormControl><Input type="number" min={0} placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  {isPM && (
                    <>
                      <FormField control={form.control} name="assigned_contractor_id" render={({ field }) => (
                        <FormItem><FormLabel>ผู้รับเหมา</FormLabel>
                          <Select onValueChange={(v) => { field.onChange(v); form.setValue("assigned_to", ""); }} value={field.value ?? ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="เลือกผู้รับเหมา (ไม่บังคับ)" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="assigned_to" render={({ field }) => {
                        const ownerOptions = selectedContractor
                          ? level2Users.filter((u) => u.contractor_id === selectedContractor)
                          : level2Users;
                        return (
                          <FormItem><FormLabel>Contractor Owner</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ""}>
                              <FormControl><SelectTrigger><SelectValue placeholder="เลือก Contractor Owner (ไม่บังคับ)" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {ownerOptions.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select><FormMessage />
                          </FormItem>
                        );
                      }} />
                    </>
                  )}
                </>
              )}

              {formLevel === 3 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem><FormLabel>สถานะ</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger></FormControl>
                          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="progress_percent" render={({ field }) => (
                      <FormItem><FormLabel>ความคืบหน้า (%)</FormLabel><FormControl><Input type="number" min={0} max={100} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="planned_start" render={({ field }) => (
                      <FormItem><FormLabel>วันเริ่ม</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="planned_end" render={({ field }) => (
                      <FormItem><FormLabel>วันเสร็จ</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  {isContractorOwner && (
                    <FormField control={form.control} name="assignees" render={({ field }) => (
                      <FormItem>
                        <FormLabel>มอบหมายให้ ({(field.value ?? []).length} คน)</FormLabel>
                        <div className="rounded-md border max-h-44 overflow-y-auto divide-y">
                          {level3Users.length === 0 && (
                            <p className="text-xs text-muted-foreground px-3 py-2">ยังไม่มีสมาชิกในทีม</p>
                          )}
                          {level3Users.map((u) => {
                            const checked = (field.value ?? []).includes(u.id);
                            return (
                              <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    const cur = field.value ?? [];
                                    field.onChange(v ? [...cur, u.id] : cur.filter((id) => id !== u.id));
                                  }}
                                />
                                <span className="text-sm flex-1">{u.first_name} {u.last_name}</span>
                                <span className="text-xs text-muted-foreground">{u.role}</span>
                              </label>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </>
              )}

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

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="ลบงาน"
        description="ต้องการลบรายการนี้หรือไม่? รายการย่อยทั้งหมดจะถูกลบด้วย"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
