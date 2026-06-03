"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import { toast } from "sonner";
import { PageHeader } from "components/ui/page-header";
import { Button } from "components/ui/button";
import { Textarea } from "components/ui/textarea";
import { LoadingSpinner, LoadingScreen } from "components/ui/loading-screen";
import { formatDate } from "lib/utils";
import {
  ArrowLeftIcon, SendIcon, ImageIcon, PlusIcon,
  CheckCircle2Icon, XCircleIcon, WrenchIcon, ClockIcon, SearchIcon,
} from "lucide-react";

const STATUS_CONFIG = {
  OPEN:      { label: "เปิดเคส",               color: "bg-blue-100 text-blue-700",    icon: ClockIcon },
  FIXING:    { label: "กำลังดำเนินการแก้ไข",    color: "bg-orange-100 text-orange-700", icon: WrenchIcon },
  VERIFYING: { label: "รอ QA ตรวจสอบ",          color: "bg-yellow-100 text-yellow-700", icon: SearchIcon },
  CLOSED:    { label: "จบเคส (ผ่านแล้ว)",       color: "bg-green-100 text-green-700",   icon: CheckCircle2Icon },
  REJECTED:  { label: "ไม่ผ่าน (ต้องแก้ใหม่)", color: "bg-red-100 text-red-700",      icon: XCircleIcon },
  ASSIGNED:  { label: "มอบหมายแล้ว",            color: "bg-purple-100 text-purple-700", icon: ClockIcon },
};

const SEVERITY_CONFIG = {
  LOW:      { label: "เล็กน้อย",  color: "bg-green-100 text-green-700" },
  MEDIUM:   { label: "ปานกลาง", color: "bg-yellow-100 text-yellow-700" },
  HIGH:     { label: "สูง",       color: "bg-orange-100 text-orange-700" },
  CRITICAL: { label: "วิกฤต",   color: "bg-red-100 text-red-700" },
};

export default function DefectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const addPhotoRef = useRef(null);

  const [defect, setDefect] = useState(null);
  const [comments, setComments] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const userRole = session?.user?.role;

  const fetchAll = async () => {
    try {
      const [defectRes, commentsRes, photosRes] = await Promise.all([
        axios.get(`/api/defects/${id}`),
        axios.get(`/api/defects/${id}/comments`),
        axios.get(`/api/defects/${id}/attachments`),
      ]);
      setDefect(defectRes.data.data);
      setComments(commentsRes.data.data ?? []);
      setPhotos(photosRes.data.data ?? []);
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleStatusChange = async (newStatus, opts = {}) => {
    setActionLoading(true);
    try {
      if (opts.action) {
        await axios.patch(`/api/defects/${id}`, { action: opts.action, note: opts.note });
        toast.success(opts.action === "ACCEPT" ? "ยืนยัน — ปิดเคสแล้ว" : "ส่งกลับแก้ไขแล้ว");
      } else {
        await axios.patch(`/api/defects/${id}`, { status: newStatus });
        toast.success("อัพเดทสถานะแล้ว");
      }
      setShowRejectForm(false);
      setRejectNote("");
      await fetchAll();
    } catch { toast.error("อัพเดทไม่สำเร็จ"); } finally { setActionLoading(false); }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await axios.post(`/api/defects/${id}/comments`, { content: commentText });
      setComments((c) => [...c, res.data.data]);
      setCommentText("");
    } catch { toast.error("ส่งคอมเมนต์ไม่สำเร็จ"); } finally { setCommentLoading(false); }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPhotoLoading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await axios.post(`/api/defects/${id}/attachments`, fd);
      setPhotos((p) => [...(res.data.data ?? []), ...p]);
      toast.success("อัพโหลดรูปสำเร็จ");
    } catch { toast.error("อัพโหลดไม่สำเร็จ"); } finally {
      setPhotoLoading(false);
      e.target.value = "";
    }
  };

  if (loading) return <LoadingScreen />;
  if (!defect) return <div className="text-center py-24 text-muted-foreground">ไม่พบข้อมูล</div>;

  const statusCfg = STATUS_CONFIG[defect.status] ?? STATUS_CONFIG.OPEN;
  const StatusIcon = statusCfg.icon;
  const sevCfg = SEVERITY_CONFIG[defect.severity] ?? SEVERITY_CONFIG.MEDIUM;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title={defect.title} description={defect.project_name}>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeftIcon className="size-4 mr-1" /> กลับ
        </Button>
      </PageHeader>

      {/* Info Card */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${statusCfg.color}`}>
            <StatusIcon className="size-4" /> {statusCfg.label}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${sevCfg.color}`}>
            {sevCfg.label}
          </span>
        </div>

        {defect.description && (
          <p className="text-sm text-muted-foreground">{defect.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          {defect.assigned_to_name && (
            <div><p className="text-muted-foreground text-xs">มอบหมายให้</p><p className="font-medium">{defect.assigned_to_name}</p></div>
          )}
          {defect.due_date && (
            <div><p className="text-muted-foreground text-xs">กำหนดแก้</p><p className="font-medium">{formatDate(defect.due_date)}</p></div>
          )}
          {defect.verified_at && (
            <div><p className="text-muted-foreground text-xs">ยืนยันเมื่อ</p><p className="font-medium">{formatDate(defect.verified_at)}</p></div>
          )}
        </div>

        {/* Action buttons - role based */}
        <div className="pt-2 border-t flex flex-wrap gap-2">
          {/* FOREMAN: OPEN/REJECTED → start fixing */}
          {(userRole === "FOREMAN") && ["OPEN", "REJECTED", "ASSIGNED"].includes(defect.status) && (
            <Button size="sm" onClick={() => handleStatusChange("FIXING")} disabled={actionLoading}>
              <WrenchIcon className="size-4 mr-1" /> เริ่มแก้ไข
            </Button>
          )}
          {/* FOREMAN: FIXING → done, send to QA */}
          {(userRole === "FOREMAN") && defect.status === "FIXING" && (
            <Button size="sm" onClick={() => handleStatusChange("VERIFYING")} disabled={actionLoading}>
              <SearchIcon className="size-4 mr-1" /> แจ้งแก้ไขเสร็จ (ส่ง QA ตรวจ)
            </Button>
          )}
          {/* QA: OPEN → assign/start */}
          {(userRole === "QA") && defect.status === "OPEN" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("FIXING")} disabled={actionLoading}>
              เริ่มดำเนินการ
            </Button>
          )}
          {/* QA: VERIFYING → ACCEPT or REJECT */}
          {(userRole === "QA") && defect.status === "VERIFYING" && !showRejectForm && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700"
                onClick={() => handleStatusChange(null, { action: "ACCEPT" })} disabled={actionLoading}>
                <CheckCircle2Icon className="size-4 mr-1" /> ผ่าน — ปิดเคส
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowRejectForm(true)} disabled={actionLoading}>
                <XCircleIcon className="size-4 mr-1" /> ไม่ผ่าน — ส่งกลับแก้
              </Button>
            </>
          )}
        </div>

        {/* Reject form */}
        {showRejectForm && (
          <div className="rounded-md border bg-red-50 p-3 space-y-2">
            <p className="text-sm font-medium text-red-700">ระบุเหตุผลที่ไม่ผ่าน</p>
            <Textarea
              placeholder="เหตุผล / รายละเอียดที่ต้องแก้ไข"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowRejectForm(false)}>ยกเลิก</Button>
              <Button size="sm" variant="destructive"
                onClick={() => handleStatusChange(null, { action: "REJECT", note: rejectNote })}
                disabled={actionLoading}>
                {actionLoading && <LoadingSpinner className="mr-1 size-3" />} ยืนยันส่งกลับแก้
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <ImageIcon className="size-4" /> รูปภาพ ({photos.length})
          </h3>
          <Button size="sm" variant="outline" onClick={() => addPhotoRef.current?.click()} disabled={photoLoading}>
            {photoLoading ? <LoadingSpinner className="mr-1 size-3" /> : <PlusIcon className="size-4 mr-1" />}
            เพิ่มรูป
          </Button>
          <input ref={addPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
        </div>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีรูปภาพ</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((p) => (
              <a key={p.id} href={p.file_url} target="_blank" rel="noopener noreferrer">
                <img src={p.file_url} className="w-full aspect-square object-cover rounded border hover:ring-2 hover:ring-primary transition" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">บทสนทนา ({comments.length})</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีความคิดเห็น</p>
          )}
          {comments.map((c) => {
            const isMe = c.user_id === session?.user?.id;
            return (
              <div key={c.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  c.author_role === "QA" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {c.author_name?.charAt(0) ?? "?"}
                </div>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">{c.author_name}</span>
                    <span className="text-xs text-muted-foreground">{c.author_role}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("th-TH")}</span>
                  </div>
                  <p className={`text-sm rounded-2xl px-3 py-2 whitespace-pre-wrap ${
                    c.content.startsWith("✅") || c.content.startsWith("❌")
                      ? "bg-muted text-muted-foreground italic"
                      : isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {defect.status !== "CLOSED" && (
          <div className="flex gap-2 pt-2 border-t">
            <Textarea
              placeholder="พิมพ์ข้อความ... (Ctrl+Enter ส่ง)"
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
        )}
        {defect.status === "CLOSED" && (
          <p className="text-center text-xs text-muted-foreground">เคสนี้ปิดแล้ว</p>
        )}
      </div>
    </div>
  );
}
