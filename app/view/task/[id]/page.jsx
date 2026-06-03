"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  CheckCircle2Icon, ClockIcon, PlayCircleIcon, XCircleIcon,
  ImageIcon, MessageSquareIcon, AlertTriangleIcon, BuildingIcon, CalendarIcon,
  ChevronDownIcon, ChevronUpIcon,
} from "lucide-react";

const STATUS_CFG = {
  PENDING:     { label: "รอดำเนินการ",   color: "bg-slate-100 text-slate-600",   bar: "bg-slate-400" },
  IN_PROGRESS: { label: "กำลังดำเนินการ", color: "bg-blue-100 text-blue-700",    bar: "bg-blue-500" },
  DONE:        { label: "เสร็จแล้ว",      color: "bg-green-100 text-green-700",  bar: "bg-green-500" },
  CANCELLED:   { label: "ยกเลิก",         color: "bg-red-100 text-red-700",      bar: "bg-red-400" },
};

const DEFECT_STATUS_CFG = {
  OPEN:      { label: "เปิดเคส",          color: "bg-blue-100 text-blue-700" },
  FIXING:    { label: "กำลังแก้ไข",       color: "bg-orange-100 text-orange-700" },
  VERIFYING: { label: "รอตรวจสอบ",        color: "bg-yellow-100 text-yellow-700" },
  CLOSED:    { label: "ผ่านแล้ว",         color: "bg-green-100 text-green-700" },
  REJECTED:  { label: "ไม่ผ่าน",          color: "bg-red-100 text-red-700" },
};

const SEV_COLOR = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

function formatThai(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border bg-white p-5 space-y-3 shadow-sm">
      <h2 className="font-semibold text-base flex items-center gap-2 text-gray-800">
        <Icon className="size-4 text-gray-400" /> {title}
      </h2>
      {children}
    </div>
  );
}

function buildChatFeed(comments, photos) {
  const items = [
    ...(comments ?? []).map((c) => ({ ...c, senderId: c.author_name, type: "comment" })),
    ...(photos ?? []).map((p) => ({ ...p, senderId: p.uploader_name, senderName: p.uploader_name, type: "photo" })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const groups = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.senderId === item.senderId) { last.items.push(item); }
    else { groups.push({ senderId: item.senderId, senderName: item.author_name ?? item.uploader_name ?? "-", senderRole: item.author_role, created_at: item.created_at, items: [item] }); }
  }
  return groups;
}

export default function PublicTaskViewPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDefects, setExpandedDefects] = useState({});

  useEffect(() => {
    axios.get(`/api/view/task/${id}`)
      .then((r) => setData(r.data.data))
      .catch((err) => setError(err?.response?.data?.message ?? "ไม่พบข้อมูลงาน หรือ link หมดอายุ"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">กำลังโหลด...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-2">
        <AlertTriangleIcon className="size-10 text-gray-300 mx-auto" />
        <p className="text-gray-500">{error ?? "ไม่พบข้อมูล"}</p>
      </div>
    </div>
  );

  const { task, comments, attachments, defects } = data;
  const sc = STATUS_CFG[task.status] ?? STATUS_CFG.PENDING;
  const progress = task.progress_percent ?? 0;
  const openDefects = defects.filter((d) => d.status !== "CLOSED").length;
  const closedDefects = defects.filter((d) => d.status === "CLOSED").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <BuildingIcon className="size-4 text-primary" />
            </div>
            <span className="font-semibold text-sm text-gray-700">King The Land</span>
          </div>
          <span className="text-xs text-gray-400">Task Progress Report</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Task Info */}
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-medium">{task.project_name ?? "โครงการ"}</p>
            <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            {task.description && <p className="text-sm text-gray-500">{task.description}</p>}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${sc.color}`}>{sc.label}</span>
            {task.assignee_names && (
              <span className="text-xs text-gray-400">ผู้รับผิดชอบ: {task.assignee_names}</span>
            )}
            {task.planned_end && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <CalendarIcon className="size-3" /> กำหนด: {formatThai(task.planned_end)}
              </span>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>ความคืบหน้า</span>
              <span className="font-semibold text-gray-800">{progress}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${sc.bar}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Defects */}
        {defects.length > 0 && (
          <Section icon={AlertTriangleIcon} title={`ข้อบกพร่อง (${defects.length})`}>
            <div className="flex gap-3 text-sm mb-1">
              <span className="text-orange-600 font-medium">{openDefects} รายการยังเปิดอยู่</span>
              <span className="text-green-600 font-medium">{closedDefects} รายการผ่านแล้ว</span>
            </div>
            <div className="space-y-2">
              {defects.map((d) => {
                const dc = DEFECT_STATUS_CFG[d.status] ?? DEFECT_STATUS_CFG.OPEN;
                const isOpen = expandedDefects[d.id];
                const feed = buildChatFeed(d.comments, d.photos);
                return (
                  <div key={d.id} className="border rounded-lg overflow-hidden">
                    {/* Header row */}
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition"
                      onClick={() => setExpandedDefects((p) => ({ ...p, [d.id]: !p[d.id] }))}
                    >
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${SEV_COLOR[d.severity] ?? SEV_COLOR.MEDIUM}`}>
                        {d.severity}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-800">{d.title}</span>
                      <span className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${dc.color}`}>{dc.label}</span>
                      {isOpen ? <ChevronUpIcon className="size-4 text-gray-400 shrink-0" /> : <ChevronDownIcon className="size-4 text-gray-400 shrink-0" />}
                    </button>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="px-3 pb-3 border-t bg-gray-50 space-y-3 pt-3">
                        {d.description && (
                          <p className="text-sm text-gray-600">{d.description}</p>
                        )}

                        {/* Chat feed */}
                        {feed.length > 0 && (
                          <div className="space-y-2.5 max-h-64 overflow-y-auto">
                            {feed.map((group, gi) => {
                              const avatarColor = group.senderRole === "QA" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700";
                              return (
                                <div key={gi} className="flex gap-2">
                                  <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${avatarColor}`}>
                                    {group.senderName?.charAt(0) ?? "?"}
                                  </div>
                                  <div className="flex flex-col gap-1 max-w-[85%]">
                                    <span className="text-xs text-gray-400">
                                      {group.senderName} · {new Date(group.created_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                                    </span>
                                    {group.items.map((item) =>
                                      item.type === "comment" ? (
                                        <p key={item.id} className={`text-xs rounded-2xl px-3 py-1.5 whitespace-pre-wrap ${
                                          item.content?.startsWith("✅") || item.content?.startsWith("❌")
                                            ? "bg-white border text-gray-400 italic"
                                            : "bg-white border text-gray-700"
                                        }`}>{item.content}</p>
                                      ) : (
                                        <a key={item.id} href={item.file_url} target="_blank" rel="noopener noreferrer">
                                          <img src={item.file_url} className="size-24 object-cover rounded-xl border hover:ring-2 hover:ring-blue-400 transition" />
                                        </a>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {feed.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-2">ยังไม่มีบันทึกหรือรูปภาพ</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <Section icon={ImageIcon} title={`รูปภาพ / ไฟล์ (${attachments.length})`}>
            <div className="grid grid-cols-3 gap-2">
              {attachments.map((a, i) => (
                <a key={i} href={a.file_url} target="_blank" rel="noopener noreferrer">
                  <img src={a.file_url} className="w-full aspect-square object-cover rounded-lg border hover:ring-2 hover:ring-primary transition" />
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Comments */}
        {comments.length > 0 && (
          <Section icon={MessageSquareIcon} title={`บันทึก / ความเห็น (${comments.length})`}>
            <div className="space-y-3">
              {comments.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {c.author_name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-700">{c.author_name}</span>
                      <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString("th-TH")}</span>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <p className="text-center text-xs text-gray-300 pb-4">
          สร้างเมื่อ: {new Date(task.created_at).toLocaleString("th-TH")}
        </p>
      </div>
    </div>
  );
}
