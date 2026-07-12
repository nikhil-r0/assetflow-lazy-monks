import { NotImplementedError } from "../../shared/errors.js";
import type { AssetStatus } from "../../shared/enums.js";
import type { RaiseMaintenanceInput } from "./maint.schema.js";

/**
 * Frozen contract for Track B (Phase 4 will call this):
 *   transitionStatus(assetId, to, actorId, reason?): Promise<Asset>
 */
export type TransitionStatusFn = (
  assetId: number,
  to: AssetStatus,
  actorId: number,
  reason?: string,
) => Promise<unknown>;

/**
 * Track C MaintService — Phase 0 stubs; Phase 2 fills workflow state machine.
 * Asset status flips deferred to Phase 4 (needs B transitionStatus).
 */
export const maintService = {
  async raise(_input: RaiseMaintenanceInput, _actorId: number): Promise<never> {
    throw new NotImplementedError("maintService.raise");
  },

  async approve(_id: number, _actorId: number): Promise<never> {
    throw new NotImplementedError("maintService.approve");
  },

  async reject(_id: number, _actorId: number, _reason?: string): Promise<never> {
    throw new NotImplementedError("maintService.reject");
  },

  async assign(_id: number, _technicianName: string, _actorId: number): Promise<never> {
    throw new NotImplementedError("maintService.assign");
  },

  async start(_id: number, _actorId: number): Promise<never> {
    throw new NotImplementedError("maintService.start");
  },

  async resolve(_id: number, _actorId: number): Promise<never> {
    throw new NotImplementedError("maintService.resolve");
  },

  async list(_filters: Record<string, unknown>): Promise<never> {
    throw new NotImplementedError("maintService.list");
  },
};
