import { AssetStatus } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";

/** Allowed from → to edges (BUILD_SPEC Track B Phase 2). */
export const ASSET_TRANSITIONS: Record<AssetStatus, readonly AssetStatus[]> = {
  [AssetStatus.Available]: [
    AssetStatus.Allocated,
    AssetStatus.Reserved,
    AssetStatus.Under_Maintenance,
    AssetStatus.Lost,
    AssetStatus.Retired,
    AssetStatus.Disposed,
  ],
  [AssetStatus.Allocated]: [
    AssetStatus.Available,
    AssetStatus.Under_Maintenance,
    AssetStatus.Lost,
  ],
  [AssetStatus.Reserved]: [
    AssetStatus.Available,
    AssetStatus.Allocated,
  ],
  [AssetStatus.Under_Maintenance]: [
    AssetStatus.Available,
    AssetStatus.Lost,
    AssetStatus.Retired,
  ],
  [AssetStatus.Lost]: [
    AssetStatus.Available,
    AssetStatus.Retired,
    AssetStatus.Disposed,
  ],
  [AssetStatus.Retired]: [AssetStatus.Disposed],
  [AssetStatus.Disposed]: [],
};

export class TransitionError extends AppError {
  constructor(from: AssetStatus, to: AssetStatus) {
    super(
      "UNPROCESSABLE",
      422,
      `Illegal asset status transition: ${from} → ${to}`,
      [{ field: "status", issue: "illegal_transition", from, to }],
    );
    this.name = "TransitionError";
  }
}

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  return ASSET_TRANSITIONS[from].includes(to);
}

/**
 * Pure state-machine check used by DB-backed transitionStatus later.
 * Controllers/services must call this (or the Prisma wrapper) — never write status ad hoc.
 */
export function transitionStatusPure(
  from: AssetStatus,
  to: AssetStatus,
): AssetStatus {
  if (!canTransition(from, to)) {
    throw new TransitionError(from, to);
  }
  return to;
}
