import { MaintStatus } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";

/** Allowed maintenance workflow edges (BUILD_SPEC Track C Phase 2). */
const TRANSITIONS: Record<MaintStatus, MaintStatus[]> = {
  [MaintStatus.pending]: [MaintStatus.approved, MaintStatus.rejected],
  [MaintStatus.approved]: [MaintStatus.technician_assigned],
  [MaintStatus.technician_assigned]: [MaintStatus.in_progress],
  [MaintStatus.in_progress]: [MaintStatus.resolved],
  [MaintStatus.rejected]: [],
  [MaintStatus.resolved]: [],
};

export function canTransitionMaint(from: MaintStatus, to: MaintStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function assertMaintTransition(from: MaintStatus, to: MaintStatus): void {
  if (!canTransitionMaint(from, to)) {
    throw new AppError(
      "UNPROCESSABLE",
      422,
      `Illegal maintenance transition: ${from} → ${to}`,
      [{ field: "status", issue: "illegal_transition", from, to }],
    );
  }
}

export { TRANSITIONS as MAINT_TRANSITIONS };
