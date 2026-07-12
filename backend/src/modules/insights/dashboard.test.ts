import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../shared/prisma.js";
import { Role, AssetStatus, AllocStatus, BookingStatus, TransferStatus, MaintStatus, Priority } from "../../shared/enums.js";

const app = createApp();

describe("Dashboard KPI and Returns Endpoints (Phase 2)", () => {
  let dept1: any;
  let dept2: any;
  let emp1: any;
  let emp2: any;
  let head1: any;
  let adminUser: any;
  let category: any;

  beforeAll(async () => {
    // Clean up tables
    await prisma.maintenance_requests.deleteMany();
    await prisma.bookings.deleteMany();
    await prisma.transfer_requests.deleteMany();
    await prisma.allocations.deleteMany();
    await prisma.assets.deleteMany();
    await prisma.asset_categories.deleteMany();
    await prisma.users.deleteMany();
    await prisma.departments.deleteMany();

    // 1. Seed org
    dept1 = await prisma.departments.create({ data: { name: "Dashboard-Eng" } });
    dept2 = await prisma.departments.create({ data: { name: "Dashboard-HR" } });

    // 2. Seed users
    emp1 = await prisma.users.create({
      data: {
        name: "Dashboard-Alice",
        email: "d-alice@assetflow.dev",
        password_hash: "hash",
        role: Role.employee,
        department_id: dept1.id,
      },
    });

    emp2 = await prisma.users.create({
      data: {
        name: "Dashboard-Bob",
        email: "d-bob@assetflow.dev",
        password_hash: "hash",
        role: Role.employee,
        department_id: dept2.id,
      },
    });

    head1 = await prisma.users.create({
      data: {
        name: "Dashboard-Charlie",
        email: "d-charlie@assetflow.dev",
        password_hash: "hash",
        role: Role.department_head,
        department_id: dept1.id,
      },
    });

    adminUser = await prisma.users.create({
      data: {
        name: "Dashboard-Admin",
        email: "d-admin@assetflow.dev",
        password_hash: "hash",
        role: Role.admin,
      },
    });

    // 3. Seed category
    category = await prisma.asset_categories.create({ data: { name: "Laptops" } });
  });

  afterAll(async () => {
    await prisma.maintenance_requests.deleteMany();
    await prisma.bookings.deleteMany();
    await prisma.transfer_requests.deleteMany();
    await prisma.allocations.deleteMany();
    await prisma.assets.deleteMany();
    await prisma.asset_categories.deleteMany();
    await prisma.users.deleteMany({ where: { email: { endsWith: "@assetflow.dev" } } });
    await prisma.departments.deleteMany({ where: { name: { startsWith: "Dashboard-" } } });
    await prisma.$disconnect();
  });

  it("test_kpis_all_zero_on_empty_db", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/kpis")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      assets_available: 0,
      assets_allocated: 0,
      maintenance_today: 0,
      active_bookings: 0,
      pending_transfers: 0,
      upcoming_returns: 0,
      overdue_returns: 0,
    });
  });

  describe("With Seeded Operations Data", () => {
    let asset1: any;
    let asset2: any;
    let asset3: any;

    beforeAll(async () => {
      // 1. Create assets
      asset1 = await prisma.assets.create({
        data: {
          asset_tag: "TAG-001",
          name: "MacBook Pro Alice",
          category_id: category.id,
          status: AssetStatus.Available,
        },
      });

      asset2 = await prisma.assets.create({
        data: {
          asset_tag: "TAG-002",
          name: "MacBook Pro Bob",
          category_id: category.id,
          status: AssetStatus.Allocated,
        },
      });

      asset3 = await prisma.assets.create({
        data: {
          asset_tag: "TAG-003",
          name: "iPad Head",
          category_id: category.id,
          status: AssetStatus.Allocated,
        },
      });

      // 2. Create allocations
      // Overdue return for emp1
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 5);
      await prisma.allocations.create({
        data: {
          asset_id: asset2.id,
          employee_id: emp1.id,
          department_id: dept1.id,
          status: AllocStatus.overdue,
          expected_return_date: overdueDate,
        },
      });

      // Upcoming return for emp2 (due in 3 days)
      const upcomingDate = new Date();
      upcomingDate.setDate(upcomingDate.getDate() + 3);
      await prisma.allocations.create({
        data: {
          asset_id: asset3.id,
          employee_id: emp2.id,
          department_id: dept2.id,
          status: AllocStatus.active,
          expected_return_date: upcomingDate,
        },
      });

      // 3. Create bookings (active)
      await prisma.bookings.create({
        data: {
          resource_asset_id: asset1.id,
          booked_by_user_id: emp1.id,
          department_id: dept1.id,
          start_time: new Date(),
          end_time: new Date(Date.now() + 2 * 3600000),
          status: BookingStatus.ongoing,
        },
      });

      // 4. Create maintenance (active)
      await prisma.maintenance_requests.create({
        data: {
          asset_id: asset2.id,
          raised_by: emp1.id,
          issue_description: "Screen cracked",
          status: MaintStatus.pending,
          priority: Priority.medium,
        },
      });

      // 5. Create transfer request (requested)
      await prisma.transfer_requests.create({
        data: {
          asset_id: asset2.id,
          from_user_id: emp1.id,
          to_user_id: emp2.id,
          requested_by: emp1.id,
          status: TransferStatus.requested,
        },
      });
    });

    it("test_assets_available_counts_only_available_status", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/kpis")
        .set("x-user-id", String(adminUser.id))
        .set("x-user-role", adminUser.role);

      expect(res.status).toBe(200);
      expect(res.body.assets_available).toBe(1); // asset1 is Available
      expect(res.body.assets_allocated).toBe(2); // asset2 and asset3 are Allocated
    });

    it("test_pending_transfers_counts_requested_only", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/kpis")
        .set("x-user-id", String(adminUser.id))
        .set("x-user-role", adminUser.role);

      expect(res.status).toBe(200);
      expect(res.body.pending_transfers).toBe(1);
    });

    it("test_overdue_vs_upcoming_returns_separated", async () => {
      const resKpis = await request(app)
        .get("/api/v1/dashboard/kpis")
        .set("x-user-id", String(adminUser.id))
        .set("x-user-role", adminUser.role);

      expect(resKpis.body.overdue_returns).toBe(1);
      expect(resKpis.body.upcoming_returns).toBe(1);

      // Verify list endpoints
      const resOverdue = await request(app)
        .get("/api/v1/dashboard/overdue")
        .set("x-user-id", String(adminUser.id))
        .set("x-user-role", adminUser.role);
      
      expect(resOverdue.body.length).toBe(1);
      expect(resOverdue.body[0].asset.name).toBe("MacBook Pro Bob");
      expect(resOverdue.body[0].days_overdue).toBe(5);

      const resUpcoming = await request(app)
        .get("/api/v1/dashboard/upcoming-returns")
        .set("x-user-id", String(adminUser.id))
        .set("x-user-role", adminUser.role);

      expect(resUpcoming.body.length).toBe(1);
      expect(resUpcoming.body[0].asset.name).toBe("iPad Head");
    });

    it("test_department_head_scope_limits_counts", async () => {
      // Charlie is head of dept1
      const res = await request(app)
        .get("/api/v1/dashboard/kpis")
        .set("x-user-id", String(head1.id))
        .set("x-user-role", head1.role)
        .set("x-user-dept-id", String(dept1.id));

      expect(res.status).toBe(200);
      // available assets are global
      expect(res.body.assets_available).toBe(1);
      // allocated assets to dept1: asset2 (via allocation to dept1)
      expect(res.body.assets_allocated).toBe(1);
      // overdue returns for dept1: 1
      expect(res.body.overdue_returns).toBe(1);
      // upcoming returns for dept1: 0 (the upcoming one is for dept2)
      expect(res.body.upcoming_returns).toBe(0);
      // active bookings in dept1: 1
      expect(res.body.active_bookings).toBe(1);
    });

    it("test_employee_scope_limits_counts", async () => {
      // Alice (emp1)
      const res = await request(app)
        .get("/api/v1/dashboard/kpis")
        .set("x-user-id", String(emp1.id))
        .set("x-user-role", emp1.role);

      expect(res.status).toBe(200);
      expect(res.body.assets_available).toBe(1);
      expect(res.body.assets_allocated).toBe(1); // allocation for asset2 is for emp1
      expect(res.body.overdue_returns).toBe(1);
      expect(res.body.upcoming_returns).toBe(0); // upcoming is for emp2
      expect(res.body.active_bookings).toBe(1);
    });
  });
});
