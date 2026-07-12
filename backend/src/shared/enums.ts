/** Shared domain enums — mirror Prisma enums in schema.prisma (BUILD_SPEC §0.2.16).
 * OWNERSHIP: Track A expands this file (UserStatus, BookingStatus, etc.).
 */

export enum Role {
  admin = "admin",
  asset_manager = "asset_manager",
  department_head = "department_head",
  employee = "employee",
}

export enum AssetStatus {
  Available = "Available",
  Allocated = "Allocated",
  Reserved = "Reserved",
  Under_Maintenance = "Under_Maintenance",
  Lost = "Lost",
  Retired = "Retired",
  Disposed = "Disposed",
}

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  [AssetStatus.Available]: "Available",
  [AssetStatus.Allocated]: "Allocated",
  [AssetStatus.Reserved]: "Reserved",
  [AssetStatus.Under_Maintenance]: "Under Maintenance",
  [AssetStatus.Lost]: "Lost",
  [AssetStatus.Retired]: "Retired",
  [AssetStatus.Disposed]: "Disposed",
};

export enum AllocStatus {
  active = "active",
  returned = "returned",
  overdue = "overdue",
}

export enum TransferStatus {
  requested = "requested",
  approved = "approved",
  rejected = "rejected",
  completed = "completed",
}

export enum UserStatus {
  active = "active",
  inactive = "inactive",
}

export enum DeptStatus {
  active = "active",
  inactive = "inactive",
}

export enum FieldType {
  text = "text",
  number = "number",
  date = "date",
  boolean = "boolean",
}

export enum BookingStatus {
  upcoming = "upcoming",
  ongoing = "ongoing",
  completed = "completed",
  cancelled = "cancelled",
}

export enum Priority {
  low = "low",
  medium = "medium",
  high = "high",
  critical = "critical",
}

export enum MaintStatus {
  pending = "pending",
  approved = "approved",
  rejected = "rejected",
  technician_assigned = "technician_assigned",
  in_progress = "in_progress",
  resolved = "resolved",
}

export enum AuditStatus {
  open = "open",
  closed = "closed",
}

export enum AuditResult {
  verified = "verified",
  missing = "missing",
  damaged = "damaged",
}

/** Notification type constants — Track D owns taxonomy; producers import these. */
export const NOTIF = {
  ASSET_ASSIGNED: "ASSET_ASSIGNED",
  TRANSFER_REQUESTED: "TRANSFER_REQUESTED",
  TRANSFER_APPROVED: "TRANSFER_APPROVED",
  TRANSFER_REJECTED: "TRANSFER_REJECTED",
  MAINTENANCE_APPROVED: "MAINTENANCE_APPROVED",
  MAINTENANCE_REJECTED: "MAINTENANCE_REJECTED",
  MAINTENANCE_RESOLVED: "MAINTENANCE_RESOLVED",
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  BOOKING_REMINDER: "BOOKING_REMINDER",
  OVERDUE_RETURN: "OVERDUE_RETURN",
  AUDIT_DISCREPANCY: "AUDIT_DISCREPANCY",
  AUDIT_ASSIGNMENT: "AUDIT_ASSIGNMENT",
} as const;

/** Activity action constants — Track D owns taxonomy; producers import these. */
export const ACT = {
  SIGNUP: "SIGNUP",
  LOGIN: "LOGIN",
  PROMOTE_USER: "PROMOTE_USER",
  CREATE_DEPARTMENT: "CREATE_DEPARTMENT",
  UPDATE_DEPARTMENT: "UPDATE_DEPARTMENT",
  CREATE_CATEGORY: "CREATE_CATEGORY",
  CREATE_ASSET: "CREATE_ASSET",
  UPDATE_ASSET: "UPDATE_ASSET",
  ALLOCATE_ASSET: "ALLOCATE_ASSET",
  RETURN_ASSET: "RETURN_ASSET",
  FLAG_OVERDUE: "FLAG_OVERDUE",
  REQUEST_TRANSFER: "REQUEST_TRANSFER",
  APPROVE_TRANSFER: "APPROVE_TRANSFER",
  REJECT_TRANSFER: "REJECT_TRANSFER",
  CREATE_BOOKING: "CREATE_BOOKING",
  CANCEL_BOOKING: "CANCEL_BOOKING",
  RAISE_MAINTENANCE: "RAISE_MAINTENANCE",
  APPROVE_MAINTENANCE: "APPROVE_MAINTENANCE",
  REJECT_MAINTENANCE: "REJECT_MAINTENANCE",
  RESOLVE_MAINTENANCE: "RESOLVE_MAINTENANCE",
  CREATE_AUDIT_CYCLE: "CREATE_AUDIT_CYCLE",
  VERIFY_AUDIT_ITEM: "VERIFY_AUDIT_ITEM",
  CLOSE_AUDIT_CYCLE: "CLOSE_AUDIT_CYCLE",
} as const;
