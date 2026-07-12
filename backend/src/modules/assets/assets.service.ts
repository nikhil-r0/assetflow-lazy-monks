import { NotImplementedError } from "../../shared/errors.js";
import type { AllocateAssetInput, CreateAssetInput } from "./assets.schema.js";
import {
  canTransition,
  transitionStatusPure,
} from "./assetStatus.js";
import { formatAssetTag, placeholderAssetTag } from "./assetTag.js";
import { validateCustomFields } from "./customFields.js";
import { buildAlreadyAllocatedConflict } from "./conflict.js";
import type { AssetStatus } from "../../shared/enums.js";

/**
 * Track B AssetService — Phase 0/1-prep helpers ready; CRUD waits on A auth + Prisma generate.
 */
export const assetService = {
  canTransition,
  transitionStatusPure,
  formatAssetTag,
  placeholderAssetTag,
  validateCustomFields,
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

  /**
   * DB wrapper — implement after `prisma generate`. Callers (C/D) should depend on this signature.
   * Until then use `transitionStatusPure` in unit tests.
   */
  async transitionStatus(
    _assetId: number,
    _to: AssetStatus,
    _actorId: number,
    _reason?: string,
  ): Promise<never> {
    throw new NotImplementedError(
      "assetService.transitionStatus (awaiting Prisma client generate + migrations)",
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
