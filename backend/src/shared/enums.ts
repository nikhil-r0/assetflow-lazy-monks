/** Shared domain enums — mirror Prisma enums in schema.prisma (BUILD_SPEC §0.2.16).
 *  OWNERSHIP: Track A expands this file (UserStatus, BookingStatus, etc.).
 *  Track B seeded Asset/Alloc/Transfer enums needed for the state machine.
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
