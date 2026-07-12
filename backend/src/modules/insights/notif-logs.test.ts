/**
 * Phase 1 tests — Shared notification + activity log infrastructure.
 * Uses real DB via PrismaPg adapter. Cleans up its own seed data.
 */
import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../shared/prisma.js";
import { Role } from "../../shared/enums.js";
import { createNotification } from "../../shared/notify.js";
import { logActivity } from "../../shared/activity.js";

const app = createApp();

// ─── Seed helpers ────────────────────────────────────────────────────────────
let dept1: { id: number };
let dept2: { id: number };
let emp1: { id: number; role: string };
let emp2: { id: number; role: string };
let head1: { id: number; role: string };
let adminUser: { id: number; role: string };

beforeAll(async () => {
  // Wipe dependent rows first (shared local DB may hold QA/booking/maint data)
  await prisma.notifications.deleteMany();
  await prisma.activity_logs.deleteMany();
  await prisma.audit_items.deleteMany().catch(() => undefined);
  await prisma.audit_cycle_auditors.deleteMany().catch(() => undefined);
  await prisma.audit_cycles.deleteMany().catch(() => undefined);
  await prisma.bookings.deleteMany();
  await prisma.maintenance_requests.deleteMany();
  await prisma.transfer_requests.deleteMany().catch(() => undefined);
  await prisma.allocations.deleteMany().catch(() => undefined);
  await prisma.asset_documents.deleteMany().catch(() => undefined);
  await prisma.assets.deleteMany().catch(() => undefined);
  await prisma.users.deleteMany();
  await prisma.departments.deleteMany();

  dept1 = await prisma.departments.create({ data: { name: "Phase1-Eng" } });
  dept2 = await prisma.departments.create({ data: { name: "Phase1-Sales" } });

  emp1 = await prisma.users.create({
    data: {
      name: "Alice-P1",
      email: "alice-p1@assetflow.dev",
      password_hash: "hash",
      role: Role.employee,
      department_id: dept1.id,
    },
  });

  emp2 = await prisma.users.create({
    data: {
      name: "Charlie-P1",
      email: "charlie-p1@assetflow.dev",
      password_hash: "hash",
      role: Role.employee,
      department_id: dept2.id,
    },
  });

  head1 = await prisma.users.create({
    data: {
      name: "Bob-Head",
      email: "bob-head@assetflow.dev",
      password_hash: "hash",
      role: Role.department_head,
      department_id: dept1.id,
    },
  });

  adminUser = await prisma.users.create({
    data: {
      name: "Admin-P1",
      email: "admin-p1@assetflow.dev",
      password_hash: "hash",
      role: Role.admin,
    },
  });
});

afterAll(async () => {
  // Clean up seed data (and rows that reference those users)
  await prisma.notifications.deleteMany();
  await prisma.activity_logs.deleteMany();
  await prisma.bookings.deleteMany();
  await prisma.maintenance_requests.deleteMany();
  await prisma.users.deleteMany({ where: { email: { endsWith: "@assetflow.dev" } } });
  await prisma.departments.deleteMany({ where: { name: { startsWith: "Phase1-" } } });
  await prisma.$disconnect();
});

// ─── 1. Shared helpers ────────────────────────────────────────────────────────
describe("createNotification helper", () => {
  it("test_creates_notification_in_db", async () => {
    await createNotification(emp1.id, "NOTIF.ALLOCATION", "Asset AF-001 allocated", "asset", 1);
    const row = await prisma.notifications.findFirst({ where: { user_id: emp1.id } });
    expect(row).not.toBeNull();
    expect(row!.type).toBe("NOTIF.ALLOCATION");
    expect(row!.is_read).toBe(false);
    await prisma.notifications.deleteMany({ where: { user_id: emp1.id } });
  });

  it("test_does_not_throw_on_bad_user_id", async () => {
    await expect(createNotification(999_999, "NOTIF.TEST", "bad user")).resolves.not.toThrow();
  });
});

describe("logActivity helper", () => {
  it("test_creates_activity_log_in_db", async () => {
    await logActivity(emp1.id, "ACT.CREATE_ASSET", "asset", 42, { tag: "AF-001" });
    const row = await prisma.activity_logs.findFirst({ where: { user_id: emp1.id } });
    expect(row).not.toBeNull();
    expect(row!.action).toBe("ACT.CREATE_ASSET");
    expect(row!.entity_type).toBe("asset");
    await prisma.activity_logs.deleteMany({ where: { user_id: emp1.id } });
  });

  it("test_accepts_null_user_id_for_system_actions", async () => {
    await expect(logActivity(null, "SYSTEM.CLEANUP", "system")).resolves.not.toThrow();
    const row = await prisma.activity_logs.findFirst({ where: { user_id: null, action: "SYSTEM.CLEANUP" } });
    expect(row).not.toBeNull();
    await prisma.activity_logs.deleteMany({ where: { action: "SYSTEM.CLEANUP" } });
  });
});

// ─── 2. Notification API endpoints ───────────────────────────────────────────
describe("GET /notifications — user-scoped list", () => {
  beforeAll(async () => {
    await prisma.notifications.deleteMany();
    // Two for emp1, one for emp2
    await createNotification(emp1.id, "NOTIF.ALLOCATION", "Notif A unread");
    await createNotification(emp1.id, "NOTIF.TRANSFER", "Notif B read");
    await createNotification(emp2.id, "NOTIF.BOOKING", "Notif C for emp2");
    // Mark Notif B as read
    await prisma.notifications.updateMany({
      where: { user_id: emp1.id, type: "NOTIF.TRANSFER" },
      data: { is_read: true },
    });
  });

  afterAll(async () => {
    await prisma.notifications.deleteMany();
  });

  it("test_returns_only_own_notifications", async () => {
    const res = await request(app)
      .get("/api/v1/notifications")
      .set("x-user-id", String(emp1.id))
      .set("x-user-role", emp1.role);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    res.body.data.forEach((n: any) => expect(n.user_id).toBe(emp1.id));
  });

  it("test_filters_by_is_read_false", async () => {
    const res = await request(app)
      .get("/api/v1/notifications?is_read=false")
      .set("x-user-id", String(emp1.id))
      .set("x-user-role", emp1.role);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].message).toBe("Notif A unread");
  });

  it("test_filters_by_is_read_true", async () => {
    const res = await request(app)
      .get("/api/v1/notifications?is_read=true")
      .set("x-user-id", String(emp1.id))
      .set("x-user-role", emp1.role);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].message).toBe("Notif B read");
  });

  it("test_returns_401_without_auth_headers", async () => {
    const res = await request(app).get("/api/v1/notifications");
    expect(res.status).toBe(401);
  });
});

describe("GET /notifications/unread-count", () => {
  beforeAll(async () => {
    await prisma.notifications.deleteMany();
    await createNotification(emp1.id, "NOTIF.ALLOCATION", "U1");
    await createNotification(emp1.id, "NOTIF.ALLOCATION", "U2");
  });

  afterAll(async () => { await prisma.notifications.deleteMany(); });

  it("test_returns_correct_unread_count", async () => {
    const res = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("x-user-id", String(emp1.id))
      .set("x-user-role", emp1.role);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
});

describe("PATCH /notifications/:id/read", () => {
  let notifId: number;

  beforeAll(async () => {
    await prisma.notifications.deleteMany();
    await createNotification(emp1.id, "NOTIF.ALLOCATION", "Mark me read");
    const row = await prisma.notifications.findFirst({ where: { user_id: emp1.id } });
    notifId = row!.id;
  });

  afterAll(async () => { await prisma.notifications.deleteMany(); });

  it("test_marks_own_notification_as_read", async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set("x-user-id", String(emp1.id))
      .set("x-user-role", emp1.role);
    expect(res.status).toBe(200);
    expect(res.body.is_read).toBe(true);
  });

  it("test_returns_404_when_marking_other_users_notification", async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set("x-user-id", String(emp2.id))
      .set("x-user-role", emp2.role);
    expect(res.status).toBe(404);
  });
});

describe("POST /notifications/mark-all-read", () => {
  beforeAll(async () => {
    await prisma.notifications.deleteMany();
    await createNotification(emp1.id, "NOTIF.ALLOCATION", "A");
    await createNotification(emp1.id, "NOTIF.TRANSFER", "B");
    await createNotification(emp2.id, "NOTIF.BOOKING", "C"); // should NOT be touched
  });

  afterAll(async () => { await prisma.notifications.deleteMany(); });

  it("test_marks_all_own_unread_as_read", async () => {
    const res = await request(app)
      .post("/api/v1/notifications/mark-all-read")
      .set("x-user-id", String(emp1.id))
      .set("x-user-role", emp1.role);
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);

    // emp2 notification should still be unread
    const emp2Notif = await prisma.notifications.findFirst({ where: { user_id: emp2.id } });
    expect(emp2Notif!.is_read).toBe(false);
  });
});

// ─── 3. Activity Logs API role-scoping ────────────────────────────────────────
describe("GET /activity-logs — role-scoped access", () => {
  beforeAll(async () => {
    await prisma.activity_logs.deleteMany();
    // emp1 (dept1), emp2 (dept2), head1 (dept1), admin
    await logActivity(emp1.id, "ACT.CREATE_ASSET", "asset", 1);
    await logActivity(emp2.id, "ACT.UPDATE_ASSET", "asset", 2);
    await logActivity(head1.id, "ACT.APPROVE_TRANSFER", "transfer", 3);
  });

  afterAll(async () => { await prisma.activity_logs.deleteMany(); });

  it("test_employee_sees_only_own_logs", async () => {
    const res = await request(app)
      .get("/api/v1/activity-logs")
      .set("x-user-id", String(emp1.id))
      .set("x-user-role", emp1.role);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].action).toBe("ACT.CREATE_ASSET");
  });

  it("test_department_head_sees_own_department_logs", async () => {
    const res = await request(app)
      .get("/api/v1/activity-logs")
      .set("x-user-id", String(head1.id))
      .set("x-user-role", head1.role)
      .set("x-user-dept-id", String(dept1.id));
    expect(res.status).toBe(200);
    // dept1 has emp1 + head1 → 2 logs; emp2 (dept2) excluded
    expect(res.body.total).toBe(2);
    const userIds: number[] = res.body.data.map((l: any) => l.user_id);
    expect(userIds).toContain(emp1.id);
    expect(userIds).toContain(head1.id);
    expect(userIds).not.toContain(emp2.id);
  });

  it("test_admin_sees_all_logs", async () => {
    const res = await request(app)
      .get("/api/v1/activity-logs")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
  });

  it("test_returns_401_without_auth_headers", async () => {
    const res = await request(app).get("/api/v1/activity-logs");
    expect(res.status).toBe(401);
  });
});
