import { beforeEach, describe, expect, it, vi } from "vitest";
import { AllocStatus, Role, TransferStatus } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { transferService } from "./transfer.service.js";
import { prisma } from "../../shared/prisma.js";

vi.mock("../../shared/prisma.js", () => ({
  prisma: {
    assets: { findUnique: vi.fn(), update: vi.fn() },
    users: { findUnique: vi.fn() },
    allocations: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    transfer_requests: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../shared/activity.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../shared/notify.js", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

const actorManager = {
  id: 99,
  role: Role.asset_manager,
  department_id: 1,
  email: "manager@assetflow.dev",
};

const actorEmployee = {
  id: 2,
  role: Role.employee,
  department_id: 1,
  email: "raj@assetflow.dev",
};

describe("transferService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_request_transfer_on_unallocated_asset_422", async () => {
    vi.mocked(prisma.assets.findUnique).mockResolvedValue({
      id: 1,
      asset_tag: "AF-0001",
    } as never);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: 2 } as never);
    vi.mocked(prisma.allocations.findFirst).mockResolvedValue(null);

    await expect(
      transferService.request({ asset_id: 1, to_user_id: 2 }, actorEmployee),
    ).rejects.toMatchObject({ code: "UNPROCESSABLE", httpStatus: 422 });
  });

  it("test_approve_non_requested_state_422", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        transfer_requests: {
          findUnique: vi.fn().mockResolvedValue({
            id: 5,
            status: TransferStatus.completed,
            asset_id: 1,
            asset: { asset_tag: "AF-0001", status: "Allocated" },
          }),
        },
      };
      return fn(tx);
    });

    await expect(transferService.approve(5, actorManager)).rejects.toMatchObject({
      code: "UNPROCESSABLE",
      httpStatus: 422,
    });
  });

  it("test_approve_transfer_reallocates_and_closes_old", async () => {
    const closed: number[] = [];
    const created: unknown[] = [];

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        transfer_requests: {
          findUnique: vi.fn().mockResolvedValue({
            id: 5,
            status: TransferStatus.requested,
            asset_id: 1,
            to_user_id: 2,
            from_user_id: 7,
            requested_by: 2,
            created_at: new Date("2026-07-12T10:00:00Z"),
            asset: { asset_tag: "AF-0114", status: "Allocated" },
          }),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({
            id: 5,
            status: TransferStatus.completed,
            approved_by: actorManager.id,
          }),
        },
        allocations: {
          findFirst: vi.fn().mockResolvedValue({
            id: 10,
            asset_id: 1,
            employee_id: 7,
            department_id: null,
            status: AllocStatus.active,
            employee: { id: 7, name: "Priya", department_id: 1 },
            department: null,
          }),
          update: vi.fn().mockImplementation(async ({ where }) => {
            closed.push(where.id);
            return { id: where.id, status: AllocStatus.returned };
          }),
          create: vi.fn().mockImplementation(async ({ data }) => {
            created.push(data);
            return { id: 11, ...data };
          }),
        },
        assets: { update: vi.fn() },
      };
      return fn(tx);
    });

    const result = await transferService.approve(5, actorManager);
    expect(result.status).toBe(TransferStatus.completed);
    expect(closed).toEqual([10]);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      asset_id: 1,
      employee_id: 2,
      status: AllocStatus.active,
    });
  });

  it("test_approve_keeps_single_active_allocation_invariant", async () => {
    let activeCount = 1;
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        transfer_requests: {
          findUnique: vi.fn().mockResolvedValue({
            id: 5,
            status: TransferStatus.requested,
            asset_id: 1,
            to_user_id: 2,
            from_user_id: 7,
            requested_by: 2,
            created_at: new Date(),
            asset: { asset_tag: "AF-0001", status: "Allocated" },
          }),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({ id: 5, status: TransferStatus.completed }),
        },
        allocations: {
          findFirst: vi.fn().mockResolvedValue({
            id: 10,
            asset_id: 1,
            employee_id: 7,
            department_id: null,
            status: AllocStatus.active,
            employee: { department_id: 1 },
            department: null,
          }),
          update: vi.fn().mockImplementation(async () => {
            activeCount -= 1;
            return { id: 10, status: AllocStatus.returned };
          }),
          create: vi.fn().mockImplementation(async () => {
            activeCount += 1;
            return { id: 11, status: AllocStatus.active };
          }),
        },
        assets: { update: vi.fn() },
      };
      const out = await fn(tx);
      expect(activeCount).toBe(1);
      return out;
    });

    await transferService.approve(5, actorManager);
  });

  it("test_reject_transfer_leaves_allocation_unchanged", async () => {
    vi.mocked(prisma.transfer_requests.findUnique).mockResolvedValue({
      id: 5,
      status: TransferStatus.requested,
      asset_id: 1,
      requested_by: 2,
      asset: { asset_tag: "AF-0001" },
    } as never);
    vi.mocked(prisma.transfer_requests.update).mockResolvedValue({
      id: 5,
      status: TransferStatus.rejected,
    } as never);

    const updated = await transferService.reject(5, actorManager, { reason: "no" });
    expect(updated.status).toBe(TransferStatus.rejected);
    expect(prisma.allocations.update).not.toHaveBeenCalled();
    expect(prisma.allocations.create).not.toHaveBeenCalled();
  });

  it("test_employee_cannot_approve_403_via_role_gate_shape", async () => {
    // Role gate is in routes; service still forbids dept_head out of scope
    const deptHead = {
      id: 3,
      role: Role.department_head,
      department_id: 9,
      email: "head@assetflow.dev",
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        transfer_requests: {
          findUnique: vi.fn().mockResolvedValue({
            id: 5,
            status: TransferStatus.requested,
            asset_id: 1,
            to_user_id: 2,
            from_user_id: 7,
            created_at: new Date(),
            asset: { asset_tag: "AF-0001", status: "Allocated" },
          }),
        },
        allocations: {
          findFirst: vi.fn().mockResolvedValue({
            id: 10,
            department_id: 1,
            employee: { department_id: 1 },
            department: null,
          }),
        },
      };
      return fn(tx);
    });

    await expect(transferService.approve(5, deptHead)).rejects.toBeInstanceOf(AppError);
    await expect(transferService.approve(5, deptHead)).rejects.toMatchObject({
      httpStatus: 403,
    });
  });
});
