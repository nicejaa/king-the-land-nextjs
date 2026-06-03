export const PROJECT_STATUS = {
  PLANNING: "PLANNING",
  ACTIVE: "ACTIVE",
  ON_HOLD: "ON_HOLD",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const PROJECT_STATUS_LABELS = {
  PLANNING: "วางแผน",
  ACTIVE: "ดำเนินการ",
  ON_HOLD: "หยุดชั่วคราว",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export const TASK_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
};

export const TASK_STATUS_LABELS = {
  PENDING: "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  DONE: "เสร็จแล้ว",
  CANCELLED: "ยกเลิก",
};

export const DEFECT_STATUS = {
  OPEN: "OPEN",
  ASSIGNED: "ASSIGNED",
  FIXING: "FIXING",
  VERIFYING: "VERIFYING",
  CLOSED: "CLOSED",
  REJECTED: "REJECTED",
};

export const DEFECT_STATUS_LABELS = {
  OPEN: "เปิด",
  ASSIGNED: "มอบหมายแล้ว",
  FIXING: "กำลังแก้ไข",
  VERIFYING: "รอตรวจสอบ",
  CLOSED: "ปิด",
  REJECTED: "ปฏิเสธ",
};

export const CONTRACT_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  TERMINATED: "TERMINATED",
};

export const CONTRACT_STATUS_LABELS = {
  DRAFT: "ร่าง",
  ACTIVE: "ใช้งาน",
  COMPLETED: "เสร็จสิ้น",
  TERMINATED: "ยกเลิก",
};

export const PO_STATUS = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  ORDERED: "ORDERED",
  DELIVERED: "DELIVERED",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
};

export const PO_STATUS_LABELS = {
  DRAFT: "ร่าง",
  APPROVED: "อนุมัติแล้ว",
  ORDERED: "สั่งซื้อแล้ว",
  DELIVERED: "ส่งมอบแล้ว",
  PAID: "ชำระแล้ว",
  CANCELLED: "ยกเลิก",
};

export const PR_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export const PR_STATUS_LABELS = {
  PENDING: "รอการอนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
};

export const LOCATION_TYPES = ["ZONE", "BUILDING", "FLOOR", "ROOM"];

export const DEFECT_SEVERITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

export const DEFECT_SEVERITY_LABELS = {
  LOW: "ต่ำ",
  MEDIUM: "ปานกลาง",
  HIGH: "สูง",
  CRITICAL: "วิกฤต",
};
