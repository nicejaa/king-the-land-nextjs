"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import { toast } from "sonner";
import { PageHeader } from "components/ui/page-header";
import { Button } from "components/ui/button";
import { Textarea } from "components/ui/textarea";
import { Input } from "components/ui/input";
import { StatusBadge } from "components/ui/status-badge";
import { Progress } from "components/ui/progress";
import { LoadingSpinner } from "components/ui/loading-screen";
import { formatDate } from "lib/utils";
import {
  ArrowLeftIcon, SendIcon, PaperclipIcon, ImageIcon, CheckCircle2Icon,
  ClockIcon, XCircleIcon, PlayCircleIcon, AlertTriangleIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon,
  WrenchIcon, SearchIcon, Share2Icon,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "components/ui/select";

const STATUS_OPTIONS = [
  { value: "PENDING",     label: "รอดำเนินการ", icon: ClockIcon },
  { value: "IN_PROGRESS", label: "กำลังดำเนินการ", icon: PlayCircleIcon },
  { value: "DONE",        label: "เสร็จแล้ว", icon: CheckCircle2Icon },
  { value: "CANCELLED",   label: "ยกเลิก", icon: XCircleIcon },
];
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]));

function buildChatFeed(comments, photos) {
  const items = [
    ...(comments ?? []).map((c) => ({
      id: c.id, senderId: c.user_id, senderName: c.author_name ?? "-",
      senderRole: c.author_role, created_at: c.created_at, type: "comment", content: c.content,
    })),
    ...(photos ?? []).map((p) => ({
      id: p.id, senderId: p.uploaded_by, senderName: p.uploader_name ?? "-",
      senderRole: null, created_at: p.created_at, type: "photo", file_url: p.file_url,
    })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const groups = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.senderId === item.senderId) {
      last.items.push(item);
    } else {
      groups.push({ senderId: item.senderId, senderName: item.senderName, senderRole: item.senderRole, created_at: item.created_at, items: [item] });
    }
  }
  return groups;
}

const DEFECT_STATUS_CFG = {
  OPEN:      { label: "เปิดเคส",            color: "bg-blue-100 text-blue-700" },
  FIXING:    { label: "กำลังแก้ไข",         color: "bg-orange-100 text-orange-700" },
  VERIFYING: { label: "รอ QA ตรวจสอบ",      color: "bg-yellow-100 text-yellow-700" },
  CLOSED:    { label: "จบเคส (ผ่านแล้ว)",   color: "bg-green-100 text-green-700" },
  REJECTED:  { label: "ไม่ผ่าน",            color: "bg-red-100 text-red-700" },
  ASSIGNED:  { label: "มอบหมายแล้ว",       color: "bg-purple-100 text-purple-700" },
};

export default function MyTaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const fileInputRef = useRef(null);
  const userRole = session?.user?.role;

  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [savingStatus, setSavingStatus] = useState(false);

  const [defects, setDefects] = useState([]);
  const [defectForm, setDefectForm] = useState({ title: "", severity: "MEDIUM", description: "" });
  const [defectFormOpen, setDefectFormOpen] = useState(false);
  const [defectLoading, setDefectLoading] = useState(false);
  const [defectFiles, setDefectFiles] = useState([]);
  const [defectPreviews, setDefectPreviews] = useState([]);
  const defectImgRef = useRef(null);
  const defectAddImgRefs = useRef({});
  const [defectExpanded, setDefectExpanded] = useState({});
  const [defectPhotos, setDefectPhotos] = useState({});
  const [defectPhotoLoading, setDefectPhotoLoading] = useState({});
  const [defectComments, setDefectComments] = useState({});
  const [defectCommentTexts, setDefectCommentTexts] = useState({});
  const [defectCommentPosting, setDefectCommentPosting] = useState({});
  const [defectStatusLoading, setDefectStatusLoading] = useState({});
  const [defectShowReject, setDefectShowReject] = useState({});
  const [defectRejectNotes, setDefectRejectNotes] = useState({});

  const fetchAll = async () => {
    try {
      const [taskRes, commentsRes, attachmentsRes] = await Promise.all([
        axios.get(`/api/my-tasks/${id}`),
        axios.get(`/api/my-tasks/${id}/comments`),
        axios.get(`/api/my-tasks/${id}/attachments`),
      ]);
      const t = taskRes.data.data;
      setTask(t);
      setProgressValue(t?.progress_percent ?? 0);
      setComments(commentsRes.data.data ?? []);
      setAttachments(attachmentsRes.data.data ?? []);
      if (t?.id) {
        const defectRes = await axios.get(`/api/defects?work_task_id=${t.id}&limit=50`);
        setDefects(defectRes.data.data ?? []);
      }
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleStatusChange = async (newStatus) => {
    setSavingStatus(true);
    try {
      await axios.patch(`/api/my-tasks/${id}`, { status: newStatus });
      setTask((t) => ({ ...t, status: newStatus }));
      toast.success("อัพเดทสถานะแล้ว");
    } catch { toast.error("อัพเดทไม่สำเร็จ"); } finally { setSavingStatus(false); }
  };

  const handleProgressSave = async () => {
    setSavingStatus(true);
    try {
      await axios.patch(`/api/my-tasks/${id}`, { progress_percent: Number(progressValue) });
      toast.success("บันทึกความคืบหน้าแล้ว");
    } catch { toast.error("บันทึกไม่สำเร็จ"); } finally { setSavingStatus(false); }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await axios.post(`/api/my-tasks/${id}/comments`, { content: commentText });
      setComments((c) => [...c, res.data.data]);
      setCommentText("");
    } catch { toast.error("ส่งคอมเมนต์ไม่สำเร็จ"); } finally { setCommentLoading(false); }
  };

  const handleDefectFilePick = (e) => {
    const files = Array.from(e.target.files ?? []);
    setDefectFiles((prev) => [...prev, ...files]);
    setDefectPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeDefectPreview = (idx) => {
    setDefectFiles((prev) => prev.filter((_, i) => i !== idx));
    setDefectPreviews((prev) => { URL.revokeObjectURL(prev[idx]); return prev.filter((_, i) => i !== idx); });
  };

  const handleDefectSubmit = async () => {
    if (!defectForm.title.trim() || !task?.project_id) return;
    setDefectLoading(true);
    try {
      const res = await axios.post("/api/defects", {
        project_id: task.project_id,
        work_task_id: task.id,
        title: defectForm.title,
        severity: defectForm.severity,
        description: defectForm.description,
      });
      const newDefect = res.data.data;
      if (defectFiles.length > 0) {
        const fd = new FormData();
        defectFiles.forEach((f) => fd.append("files", f));
        const imgRes = await axios.post(`/api/defects/${newDefect.id}/attachments`, fd);
        setDefectPhotos((p) => ({ ...p, [newDefect.id]: imgRes.data.data ?? [] }));
      }
      setDefects((d) => [newDefect, ...d]);
      setDefectForm({ title: "", severity: "MEDIUM", description: "" });
      setDefectFiles([]);
      setDefectPreviews((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
      setDefectFormOpen(false);
      toast.success("บันทึก Defect แล้ว");
    } catch { toast.error("บันทึก Defect ไม่สำเร็จ"); } finally { setDefectLoading(false); }
  };

  const toggleDefectExpand = useCallback(async (defectId) => {
    const isOpen = defectExpanded[defectId];
    setDefectExpanded((p) => ({ ...p, [defectId]: !isOpen }));
    if (!isOpen) {
      setDefectPhotoLoading((p) => ({ ...p, [defectId]: true }));
      try {
        const [photosRes, commentsRes] = await Promise.all([
          axios.get(`/api/defects/${defectId}/attachments`),
          axios.get(`/api/defects/${defectId}/comments`),
        ]);
        setDefectPhotos((p) => ({ ...p, [defectId]: photosRes.data.data ?? [] }));
        setDefectComments((p) => ({ ...p, [defectId]: commentsRes.data.data ?? [] }));
      } finally {
        setDefectPhotoLoading((p) => ({ ...p, [defectId]: false }));
      }
    }
  }, [defectExpanded]);

  const handleDefectComment = async (defectId) => {
    const text = defectCommentTexts[defectId]?.trim();
    if (!text) return;
    setDefectCommentPosting((p) => ({ ...p, [defectId]: true }));
    try {
      const res = await axios.post(`/api/defects/${defectId}/comments`, { content: text });
      setDefectComments((p) => ({ ...p, [defectId]: [...(p[defectId] ?? []), res.data.data] }));
      setDefectCommentTexts((p) => ({ ...p, [defectId]: "" }));
    } catch { toast.error("ส่งคอมเมนต์ไม่สำเร็จ"); } finally {
      setDefectCommentPosting((p) => ({ ...p, [defectId]: false }));
    }
  };

  const handleDefectStatusUpdate = async (defectId, newStatus, opts = {}) => {
    setDefectStatusLoading((p) => ({ ...p, [defectId]: true }));
    try {
      if (opts.action) {
        const res = await axios.patch(`/api/defects/${defectId}`, { action: opts.action, note: opts.note });
        const updatedStatus = res.data.data?.status ?? (opts.action === "ACCEPT" ? "CLOSED" : "REJECTED");
        setDefects((prev) => prev.map((d) => d.id === defectId ? { ...d, status: updatedStatus } : d));
        setDefectComments((p) => ({ ...p, [defectId]: undefined }));
      } else {
        await axios.patch(`/api/defects/${defectId}`, { status: newStatus });
        setDefects((prev) => prev.map((d) => d.id === defectId ? { ...d, status: newStatus } : d));
      }
      setDefectShowReject((p) => ({ ...p, [defectId]: false }));
      setDefectRejectNotes((p) => ({ ...p, [defectId]: "" }));
      toast.success("อัพเดทสถานะแล้ว");
    } catch { toast.error("อัพเดทไม่สำเร็จ"); } finally {
      setDefectStatusLoading((p) => ({ ...p, [defectId]: false }));
    }
  };

  const handleAddDefectPhoto = async (defectId, e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setDefectPhotoLoading((p) => ({ ...p, [defectId]: true }));
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await axios.post(`/api/defects/${defectId}/attachments`, fd);
      setDefectPhotos((p) => ({ ...p, [defectId]: [...(p[defectId] ?? []), ...(res.data.data ?? [])] }));
      toast.success("เพิ่มรูปสำเร็จ");
    } catch { toast.error("อัพโหลดไม่สำเร็จ"); } finally {
      setDefectPhotoLoading((p) => ({ ...p, [defectId]: false }));
      e.target.value = "";
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`/api/my-tasks/${id}/attachments`, formData);
      setAttachments((a) => [res.data.data, ...a]);
      toast.success("อัพโหลดสำเร็จ");
    } catch { toast.error("อัพโหลดไม่สำเร็จ"); } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  if (loading) return <div className="flex justify-center py-24"><LoadingSpinner /></div>;
  if (!task) return <div className="text-center py-24 text-muted-foreground">ไม่พบข้อมูลงาน</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title={task.title}
        description={task.project_name}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/my-tasks")}>
            <ArrowLeftIcon className="size-4 mr-1" /> กลับ
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const url = `${window.location.origin}/view/task/${task.id}`;
            navigator.clipboard.writeText(url).then(() => toast.success("คัดลอกลิงก์แล้ว"));
          }}>
            <Share2Icon className="size-4 mr-1" /> แชร์
          </Button>
        </div>
      </PageHeader>

      {/* Task Info */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">สถานะ</p>
            <div className="flex items-center gap-2">
              <Select value={task.status} onValueChange={handleStatusChange} disabled={savingStatus}>
                <SelectTrigger className="w-44 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">กำหนดเสร็จ</p>
            <p className="font-medium">{task.planned_end ? formatDate(task.planned_end) : "—"}</p>
          </div>
          {task.planned_start && (
            <div>
              <p className="text-muted-foreground mb-1">วันเริ่ม</p>
              <p className="font-medium">{formatDate(task.planned_start)}</p>
            </div>
          )}
          {task.description && (
            <div className="col-span-2">
              <p className="text-muted-foreground mb-1">รายละเอียด</p>
              <p>{task.description}</p>
            </div>
          )}
        </div>

        {/* Progress */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">ความคืบหน้า</p>
          <div className="flex items-center gap-3">
            <Progress value={progressValue} className="flex-1 h-2" />
            <Input
              type="number" min={0} max={100}
              value={progressValue}
              onChange={(e) => setProgressValue(Number(e.target.value))}
              className="w-20 h-8 text-center"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <Button size="sm" onClick={handleProgressSave} disabled={savingStatus}>บันทึก</Button>
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><PaperclipIcon className="size-4" /> ไฟล์แนบ ({attachments.length})</h3>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadLoading}>
            {uploadLoading ? <LoadingSpinner className="mr-2 size-3" /> : <ImageIcon className="size-4 mr-1" />}
            อัพโหลดรูป
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีไฟล์แนบ</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {attachments.map((a) => (
              <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                className="rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all">
                {a.file_type === "image" ? (
                  <img src={a.file_url} alt={a.file_name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="flex items-center gap-2 p-3 text-sm">
                    <PaperclipIcon className="size-4 shrink-0" />
                    <span className="truncate">{a.file_name}</span>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Defects */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangleIcon className="size-4 text-destructive" /> ข้อบกพร่อง (Defect) ({defects.length})
          </h3>
          <Button size="sm" variant="outline" onClick={() => setDefectFormOpen((o) => !o)}>
            <PlusIcon className="size-4 mr-1" /> แจ้ง Defect
          </Button>
        </div>

        {defectFormOpen && (
          <div className="rounded-md border bg-muted/30 p-4 space-y-3">
            <Input
              placeholder="ชื่อข้อบกพร่อง *"
              value={defectForm.title}
              onChange={(e) => setDefectForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Select value={defectForm.severity} onValueChange={(v) => setDefectForm((f) => ({ ...f, severity: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">🟢 เล็กน้อย (LOW)</SelectItem>
                <SelectItem value="MEDIUM">🟡 ปานกลาง (MEDIUM)</SelectItem>
                <SelectItem value="HIGH">🟠 สูง (HIGH)</SelectItem>
                <SelectItem value="CRITICAL">🔴 วิกฤต (CRITICAL)</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="รายละเอียดเพิ่มเติม"
              rows={2}
              value={defectForm.description}
              onChange={(e) => setDefectForm((f) => ({ ...f, description: e.target.value }))}
              className="resize-none"
            />
            <div>
              <input ref={defectImgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleDefectFilePick} />
              <Button type="button" size="sm" variant="outline" onClick={() => defectImgRef.current?.click()}>
                <ImageIcon className="size-4 mr-1" /> เพิ่มรูป
              </Button>
              {defectPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {defectPreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} className="size-16 object-cover rounded border" />
                      <button onClick={() => removeDefectPreview(i)}
                        className="absolute -top-1.5 -right-1.5 size-4 bg-destructive text-white rounded-full text-xs flex items-center justify-center leading-none">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => { setDefectFormOpen(false); setDefectFiles([]); setDefectPreviews([]); }}>ยกเลิก</Button>
              <Button size="sm" onClick={handleDefectSubmit} disabled={defectLoading || !defectForm.title.trim()}>
                {defectLoading ? <LoadingSpinner className="mr-1 size-3" /> : null} บันทึก
              </Button>
            </div>
          </div>
        )}

        {defects.length === 0 && !defectFormOpen ? (
          <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีข้อบกพร่อง</p>
        ) : (
          <div className="space-y-2">
            {defects.map((d) => (
              <div key={d.id} className="rounded-md border text-sm overflow-hidden">
                <div className="flex items-start gap-3 p-3">
                  <span className={`mt-0.5 shrink-0 font-bold text-xs px-1.5 py-0.5 rounded ${
                    d.severity === "CRITICAL" ? "bg-red-100 text-red-700" :
                    d.severity === "HIGH" ? "bg-orange-100 text-orange-700" :
                    d.severity === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700"
                  }`}>{d.severity}</span>
                  <div className="flex-1">
                    <p className="font-medium">{d.title}</p>
                    {d.description && <p className="text-muted-foreground text-xs mt-0.5">{d.description}</p>}
                  </div>
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 shrink-0 mr-1 ${
                    (DEFECT_STATUS_CFG[d.status] ?? DEFECT_STATUS_CFG.OPEN).color
                  }`}>{(DEFECT_STATUS_CFG[d.status] ?? DEFECT_STATUS_CFG.OPEN).label}</span>
                  <button onClick={() => toggleDefectExpand(d.id)} className="text-muted-foreground hover:text-foreground">
                    {defectExpanded[d.id] ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                  </button>
                </div>
                {defectExpanded[d.id] && (
                  <div className="border-t bg-muted/20 p-3 space-y-3">
                    {defectPhotoLoading[d.id] ? (
                      <div className="flex justify-center py-4"><LoadingSpinner className="size-4" /></div>
                    ) : (
                      <>
                        {/* Status Actions */}
                        {d.status !== "CLOSED" && (
                          <div className="flex flex-wrap gap-2">
                            {["FOREMAN"].includes(userRole) && ["OPEN","REJECTED","ASSIGNED"].includes(d.status) && (
                              <Button size="sm" onClick={() => handleDefectStatusUpdate(d.id, "FIXING")} disabled={defectStatusLoading[d.id]}>
                                <WrenchIcon className="size-3 mr-1" /> เริ่มแก้ไข
                              </Button>
                            )}
                            {["FOREMAN"].includes(userRole) && d.status === "FIXING" && (
                              <Button size="sm" onClick={() => handleDefectStatusUpdate(d.id, "VERIFYING")} disabled={defectStatusLoading[d.id]}>
                                <SearchIcon className="size-3 mr-1" /> แจ้งแก้ไขเสร็จ (ส่ง QA)
                              </Button>
                            )}
                            {["QA"].includes(userRole) && d.status === "OPEN" && (
                              <Button size="sm" variant="outline" onClick={() => handleDefectStatusUpdate(d.id, "FIXING")} disabled={defectStatusLoading[d.id]}>
                                เริ่มดำเนินการ
                              </Button>
                            )}
                            {["QA"].includes(userRole) && d.status === "VERIFYING" && !defectShowReject[d.id] && (
                              <>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleDefectStatusUpdate(d.id, null, { action: "ACCEPT" })} disabled={defectStatusLoading[d.id]}>
                                  <CheckCircle2Icon className="size-3 mr-1" /> ผ่าน — ปิดเคส
                                </Button>
                                <Button size="sm" variant="destructive"
                                  onClick={() => setDefectShowReject((p) => ({ ...p, [d.id]: true }))} disabled={defectStatusLoading[d.id]}>
                                  <XCircleIcon className="size-3 mr-1" /> ไม่ผ่าน
                                </Button>
                              </>
                            )}
                            {["QA"].includes(userRole) && defectShowReject[d.id] && (
                              <div className="w-full space-y-2 rounded-md border border-red-200 bg-red-50 p-2">
                                <p className="text-xs font-medium text-red-700">ระบุเหตุผล</p>
                                <Textarea rows={2} className="resize-none text-xs"
                                  placeholder="สิ่งที่ต้องแก้ไข..."
                                  value={defectRejectNotes[d.id] ?? ""}
                                  onChange={(e) => setDefectRejectNotes((p) => ({ ...p, [d.id]: e.target.value }))}
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button size="sm" variant="ghost" onClick={() => setDefectShowReject((p) => ({ ...p, [d.id]: false }))}>ยกเลิก</Button>
                                  <Button size="sm" variant="destructive"
                                    onClick={() => handleDefectStatusUpdate(d.id, null, { action: "REJECT", note: defectRejectNotes[d.id] })}
                                    disabled={defectStatusLoading[d.id]}>
                                    ยืนยันส่งกลับแก้
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Unified Chat Feed */}
                        <div className="space-y-1">
                          <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                            {buildChatFeed(defectComments[d.id], defectPhotos[d.id]).length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-3">ยังไม่มีข้อความหรือรูป</p>
                            )}
                            {buildChatFeed(defectComments[d.id], defectPhotos[d.id]).map((group, gi) => {
                              const isMe = group.senderId === session?.user?.id;
                              const avatarColor = group.senderRole === "QA" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700";
                              return (
                                <div key={gi} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                                  <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${avatarColor}`}>
                                    {group.senderName.charAt(0)}
                                  </div>
                                  <div className={`flex flex-col gap-1 max-w-[78%] ${isMe ? "items-end" : ""}`}>
                                    <span className="text-xs text-muted-foreground">
                                      {group.senderName} · {new Date(group.created_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                                    </span>
                                    {group.items.map((item) =>
                                      item.type === "comment" ? (
                                        <p key={item.id} className={`text-xs rounded-2xl px-3 py-1.5 whitespace-pre-wrap ${
                                          item.content.startsWith("✅") || item.content.startsWith("❌")
                                            ? "bg-muted text-muted-foreground italic"
                                            : isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                                        }`}>{item.content}</p>
                                      ) : (
                                        <a key={item.id} href={item.file_url} target="_blank" rel="noopener noreferrer">
                                          <img src={item.file_url} className="size-24 object-cover rounded-xl border hover:ring-2 hover:ring-primary transition" />
                                        </a>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {d.status !== "CLOSED" && (
                            <div className="flex items-end gap-2 pt-2 border-t">
                              <input type="file" accept="image/*" multiple className="hidden"
                                ref={(el) => { defectAddImgRefs.current[d.id] = el; }}
                                onChange={(e) => handleAddDefectPhoto(d.id, e)} />
                              <button onClick={() => defectAddImgRefs.current[d.id]?.click()}
                                className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                                <ImageIcon className="size-4" />
                              </button>
                              <Textarea
                                placeholder="พิมพ์ข้อความ... (Ctrl+Enter ส่ง)"
                                rows={2}
                                className="flex-1 resize-none text-xs"
                                value={defectCommentTexts[d.id] ?? ""}
                                onChange={(e) => setDefectCommentTexts((p) => ({ ...p, [d.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleDefectComment(d.id); }}
                              />
                              <Button size="icon" className="self-end size-8 shrink-0"
                                onClick={() => handleDefectComment(d.id)}
                                disabled={defectCommentPosting[d.id] || !defectCommentTexts[d.id]?.trim()}>
                                {defectCommentPosting[d.id] ? <LoadingSpinner className="size-3" /> : <SendIcon className="size-3" />}
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">คอมเมนต์ ({comments.length})</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีคอมเมนต์</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {c.author_name?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-sm font-medium">{c.author_name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("th-TH")}</span>
                </div>
                <p className="text-sm bg-muted/40 rounded-md px-3 py-2">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Textarea
            placeholder="เขียนคอมเมนต์..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleComment(); }}
          />
          <Button size="icon" onClick={handleComment} disabled={commentLoading || !commentText.trim()} className="self-end">
            {commentLoading ? <LoadingSpinner className="size-4" /> : <SendIcon className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
