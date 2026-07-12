import { Prisma } from "@prisma/client";
import {
  ACT,
  AllocStatus,
  AssetStatus,
  NOTIF,
} from "../../shared/enums.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { logActivity } from "../../shared/activity.js";
import { createNotification } from "../../shared/notify.js";
import { prisma } from "../../shared/prisma.js";
import { transitionStatusPure } from "./assetStatus.js";
import { formatAssetTag, placeholderAssetTag } from "./assetTag.js";
import { buildAlreadyAllocatedConflict } from "./conflict.js";
import { validateCustomFields } from "./customFields.js";
import type {
  AllocateAssetInput,
  CreateAssetInput,
  ListAssetsQuery,
  ReturnAllocationInput,
  UpdateAssetInput,
} from "./assets.schema.js";
import { canTransition } from "./assetStatus.js";

async function loadCategoryFields(categoryId: number) {
  const category = await prisma.asset_categories.findUnique({
    where: { id: categoryId },
    include: { custom_fields: true },
  });
  if (!category) {
    throw new AppError("VALIDATION_ERROR", 422, "Unknown category", [
      { field: "category_id", issue: "not_found" },
    ]);
  }
  return category;
}

export const assetService = {
  canTransition,
  transitionStatusPure,
  formatAssetTag,
  placeholderAssetTag,
  validateCustomFields,
  buildAlreadyAllocatedConflict,

  async create(input: CreateAssetInput, actorId: number) {
    const category = await loadCategoryFields(input.category_id);
    const customFields = validateCustomFields(
      category.custom_fields.map((f) => ({
        field_name: f.field_name,
        field_type: f.field_type as never,
      })),
      input.custom_fields,
    );

    if (input.serial_number) {
      const dup = await prisma.assets.findFirst({
        where: { serial_number: input.serial_number },
      });
      if (dup) {
        throw new AppError("CONFLICT", 409, "Serial number already exists", [
          { field: "serial_number", issue: "duplicate" },
        ]);
      }
    }

    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.assets.create({
        data: {
          asset_tag: placeholderAssetTag(),
          name: input.name,
          category_id: input.category_id,
          serial_number: input.serial_number ?? null,
          acquisition_date: input.acquisition_date
            ? new Date(input.acquisition_date)
            : null,
          acquisition_cost:
            input.acquisition_cost != null
              ? new Prisma.Decimal(input.acquisition_cost)
              : null,
          condition: input.condition ?? null,
          location: input.location ?? null,
          custom_fields: customFields as Prisma.InputJsonValue,
          is_bookable: input.is_bookable ?? false,
          status: AssetStatus.Available,
          documents: input.documents?.length
            ? {
                create: input.documents.map((d) => ({
                  file_url: d.file_url,
                  doc_type: d.doc_type ?? null,
                })),
              }
            : undefined,
        },
        include: { documents: true, category: true },
      });

      const tag = formatAssetTag(created.id);
      return tx.assets.update({
        where: { id: created.id },
        data: { asset_tag: tag, qr_code: tag },
        include: { documents: true, category: true },
      });
    });

    await logActivity(actorId, ACT.CREATE_ASSET, "asset", asset.id, {
      asset_tag: asset.asset_tag,
    });

    return asset;
  },

  async list(query: ListAssetsQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.assetsWhereInput = {};

    if (query.category_id != null) where.category_id = query.category_id;
    if (query.status) where.status = query.status;
    if (query.location) where.location = query.location;
    if (query.is_bookable != null) where.is_bookable = query.is_bookable;
    if (query.q) {
      where.OR = [
        { asset_tag: { contains: query.q, mode: "insensitive" } },
        { serial_number: { contains: query.q, mode: "insensitive" } },
        { name: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.assets.count({ where }),
      prisma.assets.findMany({
        where,
        include: { category: true, documents: true },
        orderBy: { id: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },

  async getById(id: number) {
    const asset = await prisma.assets.findUnique({
      where: { id },
      include: {
        category: { include: { custom_fields: true } },
        documents: true,
        allocations: {
          where: { status: { in: [AllocStatus.active, AllocStatus.overdue] } },
          include: { employee: true, department: true },
          take: 1,
        },
      },
    });
    if (!asset) throw new NotFoundError("Asset not found");
    return {
      ...asset,
      current_allocation: asset.allocations[0] ?? null,
      allocations: undefined,
    };
  },

  async update(id: number, input: UpdateAssetInput, actorId: number) {
    const existing = await prisma.assets.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Asset not found");

    const categoryId = input.category_id ?? existing.category_id;
    if (input.custom_fields !== undefined || input.category_id !== undefined) {
      const category = await loadCategoryFields(categoryId);
      if (input.custom_fields !== undefined && input.custom_fields !== null) {
        validateCustomFields(
          category.custom_fields.map((f) => ({
            field_name: f.field_name,
            field_type: f.field_type as never,
          })),
          input.custom_fields,
        );
      }
    }

    if (input.serial_number) {
      const dup = await prisma.assets.findFirst({
        where: { serial_number: input.serial_number, NOT: { id } },
      });
      if (dup) {
        throw new AppError("CONFLICT", 409, "Serial number already exists", [
          { field: "serial_number", issue: "duplicate" },
        ]);
      }
    }

    const updated = await prisma.assets.update({
      where: { id },
      data: {
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.category_id != null ? { category_id: input.category_id } : {}),
        ...(input.serial_number !== undefined
          ? { serial_number: input.serial_number }
          : {}),
        ...(input.acquisition_date !== undefined
          ? {
              acquisition_date: input.acquisition_date
                ? new Date(input.acquisition_date)
                : null,
            }
          : {}),
        ...(input.acquisition_cost !== undefined
          ? {
              acquisition_cost:
                input.acquisition_cost != null
                  ? new Prisma.Decimal(input.acquisition_cost)
                  : null,
            }
          : {}),
        ...(input.condition !== undefined ? { condition: input.condition } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.is_bookable !== undefined
          ? { is_bookable: input.is_bookable }
          : {}),
        ...(input.custom_fields !== undefined
          ? {
              custom_fields:
                input.custom_fields === null
                  ? Prisma.JsonNull
                  : (input.custom_fields as Prisma.InputJsonValue),
            }
          : {}),
      },
      include: { documents: true, category: true },
    });

    await logActivity(actorId, ACT.UPDATE_ASSET, "asset", id, { patch: input });
    return updated;
  },

  async addDocument(
    assetId: number,
    input: { file_url: string; doc_type?: string },
  ) {
    const asset = await prisma.assets.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundError("Asset not found");
    return prisma.asset_documents.create({
      data: {
        asset_id: assetId,
        file_url: input.file_url,
        doc_type: input.doc_type ?? null,
      },
    });
  },

  async getHistory(assetId: number) {
    const asset = await prisma.assets.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundError("Asset not found");

    const [allocations, maintenance] = await Promise.all([
      prisma.allocations.findMany({
        where: { asset_id: assetId },
        orderBy: { allocated_date: "desc" },
        include: { employee: true, department: true },
      }),
      prisma.maintenance_requests.findMany({
        where: { asset_id: assetId },
        orderBy: { created_at: "desc" },
      }),
    ]);

    return { allocations, maintenance };
  },

  /**
   * Central DB status writer — C/D must call this (BUILD_SPEC I5).
   */
  async transitionStatus(
    assetId: number,
    to: AssetStatus,
    actorId: number,
    reason?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const asset = await tx.assets.findUnique({ where: { id: assetId } });
      if (!asset) throw new NotFoundError("Asset not found");

      const from = asset.status as AssetStatus;
      transitionStatusPure(from, to);

      const updated = await tx.assets.update({
        where: { id: assetId },
        data: { status: to },
      });

      await logActivity(actorId, ACT.UPDATE_ASSET, "asset", assetId, {
        from,
        to,
        reason,
      });

      return updated;
    });
  },

  async allocate(input: AllocateAssetInput, actorId: number) {
    return prisma.$transaction(async (tx) => {
      const asset = await tx.assets.findUnique({ where: { id: input.asset_id } });
      if (!asset) throw new NotFoundError("Asset not found");

      const active = await tx.allocations.findFirst({
        where: {
          asset_id: input.asset_id,
          status: { in: [AllocStatus.active, AllocStatus.overdue] },
        },
        include: { employee: true, department: true },
      });

      if (active) {
        const holderName =
          active.employee?.name ??
          active.department?.name ??
          "another holder";
        const conflict = buildAlreadyAllocatedConflict({
          holderUserId: active.employee_id,
          holderName,
          assetTag: asset.asset_tag,
        });
        throw new AppError(
          conflict.error.code,
          409,
          conflict.error.message,
          conflict.error.details,
        );
      }

      if (asset.status !== AssetStatus.Available) {
        throw new AppError(
          "UNPROCESSABLE",
          422,
          `Asset status must be Available to allocate (was ${asset.status})`,
          [{ field: "asset_id", issue: "not_available", status: asset.status }],
        );
      }

      if (input.employee_id) {
        const user = await tx.users.findUnique({ where: { id: input.employee_id } });
        if (!user) throw new NotFoundError("Employee not found");
      }
      if (input.department_id) {
        const dept = await tx.departments.findUnique({
          where: { id: input.department_id },
        });
        if (!dept) throw new NotFoundError("Department not found");
      }

      transitionStatusPure(AssetStatus.Available, AssetStatus.Allocated);
      await tx.assets.update({
        where: { id: input.asset_id },
        data: { status: AssetStatus.Allocated },
      });

      const allocation = await tx.allocations.create({
        data: {
          asset_id: input.asset_id,
          employee_id: input.employee_id ?? null,
          department_id: input.department_id ?? null,
          expected_return_date: input.expected_return_date
            ? new Date(input.expected_return_date)
            : null,
          condition_notes_out: input.condition_notes_out ?? null,
          status: AllocStatus.active,
        },
        include: { employee: true, department: true, asset: true },
      });

      if (input.employee_id) {
        await createNotification(
          input.employee_id,
          NOTIF.ASSET_ASSIGNED,
          `Asset ${asset.asset_tag} assigned to you`,
          "allocation",
          allocation.id,
        );
      }
      await logActivity(actorId, ACT.ALLOCATE_ASSET, "allocation", allocation.id, {
        asset_id: input.asset_id,
      });

      return allocation;
    });
  },

  async returnAllocation(
    allocationId: number,
    input: ReturnAllocationInput,
    actorId: number,
  ) {
    return prisma.$transaction(async (tx) => {
      const allocation = await tx.allocations.findUnique({
        where: { id: allocationId },
      });
      if (!allocation) throw new NotFoundError("Allocation not found");
      if (
        allocation.status !== AllocStatus.active &&
        allocation.status !== AllocStatus.overdue
      ) {
        throw new AppError("UNPROCESSABLE", 422, "Allocation already returned", [
          { field: "status", issue: "already_returned" },
        ]);
      }

      const updated = await tx.allocations.update({
        where: { id: allocationId },
        data: {
          status: AllocStatus.returned,
          actual_return_date: input.actual_return_date
            ? new Date(input.actual_return_date)
            : new Date(),
          condition_notes_in: input.condition_notes_in ?? null,
        },
      });

      const asset = await tx.assets.findUnique({
        where: { id: allocation.asset_id },
      });
      if (asset && asset.status === AssetStatus.Allocated) {
        transitionStatusPure(AssetStatus.Allocated, AssetStatus.Available);
        await tx.assets.update({
          where: { id: asset.id },
          data: { status: AssetStatus.Available },
        });
      }

      await logActivity(actorId, ACT.RETURN_ASSET, "allocation", allocationId, {
        asset_id: allocation.asset_id,
      });

      return updated;
    });
  },
};
