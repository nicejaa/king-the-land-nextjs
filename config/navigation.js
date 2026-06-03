import {
  LayoutDashboard,
  Users,
  Shield,
  FolderKanban,
  Building2,
  FileText,
  ClipboardList,
  SearchCheck,
  AlertTriangle,
  ShoppingCart,
  Bell,
  HardHat,
  ListTodo,
} from "lucide-react";
import { PERMISSIONS } from "constants/permissions";

/**
 * @typedef {Object} NavItem
 * @property {string} title
 * @property {string} href
 * @property {any} icon
 * @property {string} [permission]
 * @property {NavItem[]} [children]
 */

/** @type {NavItem[]} */
export const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    title: "โครงการ",
    href: "/projects",
    icon: FolderKanban,
    permission: PERMISSIONS.PROJECT_VIEW,
  },
  {
    title: "งาน (WBS)",
    href: "/tasks",
    icon: ClipboardList,
    permission: PERMISSIONS.PROJECT_VIEW,
  },
  {
    title: "งานของฉัน",
    href: "/my-tasks",
    icon: ListTodo,
    permission: PERMISSIONS.MY_TASK_VIEW,
  },
  {
    title: "ตรวจสอบคุณภาพ",
    href: "/inspections",
    icon: SearchCheck,
    permission: PERMISSIONS.INSPECTION_VIEW,
  },
  {
    title: "ข้อบกพร่อง",
    href: "/defects",
    icon: AlertTriangle,
    permission: PERMISSIONS.DEFECT_VIEW,
  },
  {
    title: "ผู้รับเหมา",
    href: "/contractors",
    icon: Building2,
    permission: PERMISSIONS.CONTRACTOR_VIEW,
  },
  {
    title: "สัญญา",
    href: "/contracts",
    icon: FileText,
    permission: PERMISSIONS.CONTRACT_VIEW,
  },
  {
    title: "จัดซื้อ",
    href: "/procurement/pr",
    icon: ShoppingCart,
    permission: PERMISSIONS.PR_VIEW,
    children: [
      {
        title: "ใบขอซื้อ (PR)",
        href: "/procurement/pr",
        permission: PERMISSIONS.PR_VIEW,
      },
      {
        title: "ใบสั่งซื้อ (PO)",
        href: "/procurement/po",
        permission: PERMISSIONS.PO_VIEW,
      },
      {
        title: "รับของ (GR)",
        href: "/procurement/gr",
        permission: PERMISSIONS.GR_VIEW,
      },
    ],
  },
  {
    title: "ทีมของฉัน",
    href: "/team",
    icon: HardHat,
    permission: PERMISSIONS.USER_CREATE,
  },
  {
    title: "ผู้ใช้งาน",
    href: "/users",
    icon: Users,
    permission: PERMISSIONS.USER_VIEW,
  },
  {
    title: "บทบาท",
    href: "/roles",
    icon: Shield,
    permission: PERMISSIONS.ROLE_VIEW,
  },
  {
    title: "การแจ้งเตือน",
    href: "/notifications",
    icon: Bell,
    permission: PERMISSIONS.NOTIFICATION_VIEW,
  },
];

/** Route → required permission map for middleware */
export const routePermissions = {
  "/dashboard": PERMISSIONS.DASHBOARD_VIEW,
  "/projects": PERMISSIONS.PROJECT_VIEW,
  "/tasks": PERMISSIONS.TASK_VIEW,
  "/my-tasks": PERMISSIONS.MY_TASK_VIEW,
  "/daily-logs": PERMISSIONS.DAILY_LOG_VIEW,
  "/inspections": PERMISSIONS.INSPECTION_VIEW,
  "/defects": PERMISSIONS.DEFECT_VIEW,
  "/contractors": PERMISSIONS.CONTRACTOR_VIEW,
  "/contracts": PERMISSIONS.CONTRACT_VIEW,
  "/procurement/pr": PERMISSIONS.PR_VIEW,
  "/procurement/po": PERMISSIONS.PO_VIEW,
  "/procurement/gr": PERMISSIONS.GR_VIEW,
  "/team": PERMISSIONS.USER_CREATE,
  "/users": PERMISSIONS.USER_VIEW,
  "/roles": PERMISSIONS.ROLE_VIEW,
  "/notifications": PERMISSIONS.NOTIFICATION_VIEW,
};
