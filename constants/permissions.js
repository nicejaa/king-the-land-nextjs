/**
 * All system permissions in MODULE_ACTION format
 */
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "DASHBOARD_VIEW",

  // Users
  USER_VIEW: "USER_VIEW",
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DELETE: "USER_DELETE",

  // Roles
  ROLE_VIEW: "ROLE_VIEW",
  ROLE_CREATE: "ROLE_CREATE",
  ROLE_UPDATE: "ROLE_UPDATE",
  ROLE_DELETE: "ROLE_DELETE",

  // Projects
  PROJECT_VIEW: "PROJECT_VIEW",
  PROJECT_CREATE: "PROJECT_CREATE",
  PROJECT_UPDATE: "PROJECT_UPDATE",
  PROJECT_DELETE: "PROJECT_DELETE",

  // Locations
  LOCATION_VIEW: "LOCATION_VIEW",
  LOCATION_CREATE: "LOCATION_CREATE",
  LOCATION_UPDATE: "LOCATION_UPDATE",
  LOCATION_DELETE: "LOCATION_DELETE",

  // Contractors
  CONTRACTOR_VIEW: "CONTRACTOR_VIEW",
  CONTRACTOR_CREATE: "CONTRACTOR_CREATE",
  CONTRACTOR_UPDATE: "CONTRACTOR_UPDATE",
  CONTRACTOR_DELETE: "CONTRACTOR_DELETE",

  // Contracts
  CONTRACT_VIEW: "CONTRACT_VIEW",
  CONTRACT_CREATE: "CONTRACT_CREATE",
  CONTRACT_UPDATE: "CONTRACT_UPDATE",
  CONTRACT_DELETE: "CONTRACT_DELETE",

  // Work Tasks
  MY_TASK_VIEW: "MY_TASK_VIEW",
  TASK_VIEW: "TASK_VIEW",
  TASK_CREATE: "TASK_CREATE",
  TASK_UPDATE: "TASK_UPDATE",
  TASK_DELETE: "TASK_DELETE",
  TASK_ASSIGN: "TASK_ASSIGN",

  // Daily Logs
  DAILY_LOG_VIEW: "DAILY_LOG_VIEW",
  DAILY_LOG_CREATE: "DAILY_LOG_CREATE",
  DAILY_LOG_UPDATE: "DAILY_LOG_UPDATE",
  DAILY_LOG_DELETE: "DAILY_LOG_DELETE",

  // Inspections
  INSPECTION_VIEW: "INSPECTION_VIEW",
  INSPECTION_CREATE: "INSPECTION_CREATE",
  INSPECTION_VERIFY: "INSPECTION_VERIFY",

  // Defects
  DEFECT_VIEW: "DEFECT_VIEW",
  DEFECT_CREATE: "DEFECT_CREATE",
  DEFECT_UPDATE: "DEFECT_UPDATE",
  DEFECT_DELETE: "DEFECT_DELETE",
  DEFECT_VERIFY: "DEFECT_VERIFY",

  // Purchase Requests
  PR_VIEW: "PR_VIEW",
  PR_CREATE: "PR_CREATE",
  PR_APPROVE: "PR_APPROVE",

  // Purchase Orders
  PO_VIEW: "PO_VIEW",
  PO_CREATE: "PO_CREATE",
  PO_APPROVE: "PO_APPROVE",

  // Goods Receipts
  GR_VIEW: "GR_VIEW",
  GR_CREATE: "GR_CREATE",

  // Attachments
  UPLOAD_FILE: "UPLOAD_FILE",
  DELETE_FILE: "DELETE_FILE",

  // Notifications
  NOTIFICATION_VIEW: "NOTIFICATION_VIEW",
};

/** All permission codes as array */
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/** Permission modules for grouping in UI */
export const PERMISSION_MODULES = [
  {
    module: "DASHBOARD",
    label: "Dashboard",
    permissions: ["DASHBOARD_VIEW"],
  },
  {
    module: "USER",
    label: "Users",
    permissions: ["USER_VIEW", "USER_CREATE", "USER_UPDATE", "USER_DELETE"],
  },
  {
    module: "ROLE",
    label: "Roles",
    permissions: ["ROLE_VIEW", "ROLE_CREATE", "ROLE_UPDATE", "ROLE_DELETE"],
  },
  {
    module: "PROJECT",
    label: "Projects",
    permissions: [
      "PROJECT_VIEW",
      "PROJECT_CREATE",
      "PROJECT_UPDATE",
      "PROJECT_DELETE",
    ],
  },
  {
    module: "LOCATION",
    label: "Locations",
    permissions: [
      "LOCATION_VIEW",
      "LOCATION_CREATE",
      "LOCATION_UPDATE",
      "LOCATION_DELETE",
    ],
  },
  {
    module: "CONTRACTOR",
    label: "Contractors",
    permissions: [
      "CONTRACTOR_VIEW",
      "CONTRACTOR_CREATE",
      "CONTRACTOR_UPDATE",
      "CONTRACTOR_DELETE",
    ],
  },
  {
    module: "CONTRACT",
    label: "Contracts",
    permissions: [
      "CONTRACT_VIEW",
      "CONTRACT_CREATE",
      "CONTRACT_UPDATE",
      "CONTRACT_DELETE",
    ],
  },
  {
    module: "TASK",
    label: "Work Tasks",
    permissions: [
      "MY_TASK_VIEW",
      "TASK_VIEW",
      "TASK_CREATE",
      "TASK_UPDATE",
      "TASK_DELETE",
      "TASK_ASSIGN",
    ],
  },
  {
    module: "DAILY_LOG",
    label: "Daily Logs",
    permissions: [
      "DAILY_LOG_VIEW",
      "DAILY_LOG_CREATE",
      "DAILY_LOG_UPDATE",
      "DAILY_LOG_DELETE",
    ],
  },
  {
    module: "INSPECTION",
    label: "Inspections",
    permissions: [
      "INSPECTION_VIEW",
      "INSPECTION_CREATE",
      "INSPECTION_VERIFY",
    ],
  },
  {
    module: "DEFECT",
    label: "Defects",
    permissions: [
      "DEFECT_VIEW",
      "DEFECT_CREATE",
      "DEFECT_UPDATE",
      "DEFECT_DELETE",
      "DEFECT_VERIFY",
    ],
  },
  {
    module: "PROCUREMENT",
    label: "Procurement",
    permissions: [
      "PR_VIEW",
      "PR_CREATE",
      "PR_APPROVE",
      "PO_VIEW",
      "PO_CREATE",
      "PO_APPROVE",
      "GR_VIEW",
      "GR_CREATE",
    ],
  },
  {
    module: "FILE",
    label: "Files",
    permissions: ["UPLOAD_FILE", "DELETE_FILE"],
  },
  {
    module: "NOTIFICATION",
    label: "Notifications",
    permissions: ["NOTIFICATION_VIEW"],
  },
];
