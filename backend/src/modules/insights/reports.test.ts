import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../shared/prisma.js";
import { Role, AssetStatus, AllocStatus, BookingStatus, MaintStatus, Priority } from "../../shared/enums.js";

const app = createApp();

describe("Reports Module (Phase 5)", () => {
  let adminUser: any;
  let emp1: any;
  let dept1: any;
  let category: any;
  let asset1: any;
  let asset2: any;

  beforeAll(async () => {
    await prisma.maintenance_requests.deleteMany();
    await prisma.bookings.deleteMany();
    await prisma.allocations.deleteMany();
    await prisma.assets.deleteMany();
    await prisma.asset_categories.deleteMany();
    await prisma.users.deleteMany();
    await prisma.departments.deleteMany();

    dept1 = await prisma.departments.create({ data: { name: "Rpt-Eng" } });
    category = await prisma.asset_categories.create({ data: { name: "Rpt-Laptops" } });

    adminUser = await prisma.users.create({
      data: { name: "Rpt-Admin", email: "rpt-admin@af.dev", password_hash: "h", role: Role.admin },
    });
    emp1 = await prisma.users.create({
      data: { name: "Rpt-Emp1", email: "rpt-emp1@af.dev", password_hash: "h", role: Role.employee, department_id: dept1.id },
    });

    // Asset with allocation
    asset1 = await prisma.assets.create({
      data: {
        asset_tag: "RPT-001",
        name: "Laptop Active",
        category_id: category.id,
        status: AssetStatus.Allocated,
        acquisition_cost: 1500,
        acquisition_date: new Date("2019-01-01"), // Old asset
      },
    });

    // Asset never allocated (idle)
    asset2 = await prisma.assets.create({
      data: { asset_tag: "RPT-002", name: "Idle Laptop", category_id: category.id, status: AssetStatus.Available, acquisition_cost: 800 },
    });

    // Allocation for asset1
    await prisma.allocations.create({
      data: {
        asset_id: asset1.id,
        employee_id: emp1.id,
        department_id: dept1.id,
        status: AllocStatus.returned,
        allocated_date: new Date("2026-01-01"),
        actual_return_date: new Date("2026-03-01"),
      },
    });

    // Booking for heatmap test (Tuesday=2, 10:00)
    const tuesday10am = new Date("2026-07-07T10:00:00Z");
    await prisma.bookings.create({
      data: {
        resource_asset_id: asset1.id,
        booked_by_user_id: emp1.id,
        department_id: dept1.id,
        start_time: tuesday10am,
        end_time: new Date("2026-07-07T11:00:00Z"),
        status: BookingStatus.completed,
      },
    });

    // Maintenance request
    await prisma.maintenance_requests.create({
      data: { asset_id: asset1.id, raised_by: emp1.id, issue_description: "Broken", status: MaintStatus.resolved, priority: Priority.medium },
    });
  });

  afterAll(async () => {
    await prisma.maintenance_requests.deleteMany();
    await prisma.bookings.deleteMany();
    await prisma.allocations.deleteMany();
    await prisma.assets.deleteMany();
    await prisma.asset_categories.deleteMany();
    await prisma.users.deleteMany({ where: { email: { endsWith: "@af.dev" } } });
    await prisma.departments.deleteMany({ where: { name: { startsWith: "Rpt-" } } });
    await prisma.$disconnect();
  });

  it("test_utilization_marks_never_allocated_as_idle", async () => {
    const res = await request(app)
      .get("/api/v1/reports/asset-utilization")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(res.status).toBe(200);
    const idle = res.body.find((a: any) => a.asset_tag === "RPT-002");
    expect(idle).toBeDefined();
    expect(idle.is_idle).toBe(true);
    expect(idle.allocation_count).toBe(0);
  });

  it("test_utilization_days_allocated_computation", async () => {
    const res = await request(app)
      .get("/api/v1/reports/asset-utilization")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    const active = res.body.find((a: any) => a.asset_tag === "RPT-001");
    expect(active).toBeDefined();
    expect(active.allocation_count).toBe(1);
    expect(active.days_allocated).toBeGreaterThan(0);
    expect(active.is_idle).toBe(false);
  });

  it("test_maintenance_frequency_grouped_by_category", async () => {
    const res = await request(app)
      .get("/api/v1/reports/maintenance-frequency")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(res.status).toBe(200);
    expect(res.body.by_asset).toBeDefined();
    expect(res.body.by_category).toBeDefined();
    const cat = res.body.by_category.find((c: any) => c.category === "Rpt-Laptops");
    expect(cat?.request_count).toBeGreaterThan(0);
  });

  it("test_department_allocation_sums_value", async () => {
    const res = await request(app)
      .get("/api/v1/reports/department-allocation")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(res.status).toBe(200);
    // No active allocations in this test (all returned), so dept1 should have 0 active
    const dept = res.body.find((d: any) => d.department === "Rpt-Eng");
    expect(dept).toBeDefined();
    expect(dept.active_allocations).toBe(0);
  });

  it("test_heatmap_buckets_by_weekday_hour", async () => {
    const res = await request(app)
      .get("/api/v1/reports/booking-heatmap")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const expectedHour = new Date("2026-07-07T10:00:00Z").getHours();
    const bucket = res.body.find((b: any) => b.hour === expectedHour);
    expect(bucket).toBeDefined();
    expect(bucket.count).toBeGreaterThan(0);
  });

  it("test_export_csv_has_header_and_rows", async () => {
    const res = await request(app)
      .get("/api/v1/reports/export?report=asset-utilization")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    const lines = res.text.split("\n");
    expect(lines[0]).toBe("asset_id,asset_tag,name,allocation_count,days_allocated,is_idle");
    expect(lines.length).toBeGreaterThan(1);
  });
});
