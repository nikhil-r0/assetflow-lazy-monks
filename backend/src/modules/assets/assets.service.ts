import { NotImplementedError } from "../../shared/errors.js";
import type { AllocateAssetInput, CreateAssetInput } from "./assets.schema.js";
import {
  canTransition,
  transitionStatusPure,
} from "./assetStatus.js";
import { buildAlreadyAllocatedConflict } from "./conflict.js";
import type { AssetStatus } from "../../shared/enums.js";

/**
 * Track B AssetService skeleton (BUILD_SPEC Phase 0).
 * Real DB wiring lands in later phases; transition helpers are ready for C/D.
 */
export const assetService = {
  canTransition,
  transitionStatusPure,
  buildAlreadyAllocatedConflict,

  async create(_input: CreateAssetInput): Promise<never> {
    throw new NotImplementedError("assetService.create");
  },

  async list(): Promise<never> {
    throw new NotImplementedError("assetService.list");
  },

  async getById(_id: number): Promise<never> {
    throw new NotImplementedError("assetService.getById");
  },

  async update(_id: number, _input: Partial<CreateAssetInput>): Promise<never> {
    throw new NotImplementedError("assetService.update");
  },

  async transitionStatus(
    _assetId: number,
    _to: AssetStatus,
    _actorId: number,
    _reason?: string,
  ): Promise<never> {
    throw new NotImplementedError(
      "assetService.transitionStatus (DB wrapper — use transitionStatusPure until Prisma client is wired)",
    );
  },

  async allocate(_input: AllocateAssetInput, _actorId: number): Promise<never> {
    throw new NotImplementedError("assetService.allocate");
  },

  async returnAllocation(_id: number, _actorId: number): Promise<never> {
    throw new NotImplementedError("assetService.returnAllocation");
  },

  async requestTransfer(_assetId: number, _toUserId: number, _actorId: number): Promise<never> {
    throw new NotImplementedError("assetService.requestTransfer");
  },

  async approveTransfer(_id: number, _actorId: number): Promise<never> {
    throw new NotImplementedError("assetService.approveTransfer");
  },
};
