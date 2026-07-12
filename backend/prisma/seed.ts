/**
 * Idempotent demo seed — skip/upsert by natural keys (no wipe).
 * Spec: docs/superpowers/specs/2026-07-12-database-seed-design.md
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_PASSWORD = "Passw0rd!";

function log(action: "created" | "skipped" | "updated", entity: string, key: string) {
  console.log(`[seed] ${action.padEnd(7)} ${entity} ${key}`);
}

async function seed() {
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- departments (names first) ---
  const engineering = await prisma.departments.upsert({
    where: { name: "Engineering" },
    create: { name: "Engineering", status: "active" },
    update: { status: "active" },
  });
  const sales = await prisma.departments.upsert({
    where: { name: "Sales" },
    create: { name: "Sales", status: "active" },
    update: { status: "active" },
  });
  console.log(`[seed] upserted departments Engineering(#${engineering.id}), Sales(#${sales.id})`);

  // --- users ---
  const userDefs = [
    {
      email: "admin@assetflow.dev",
      name: "Admin",
      role: "admin" as const,
      department_id: null as number | null,
    },
    {
      email: "manager@assetflow.dev",
      name: "Asset Manager",
      role: "asset_manager" as const,
      department_id: engineering.id,
    },
    {
      email: "head@assetflow.dev",
      name: "Dept Head",
      role: "department_head" as const,
      department_id: engineering.id,
    },
    {
      email: "employee@assetflow.dev",
      name: "Priya",
      role: "employee" as const,
      department_id: engineering.id,
    },
    {
      email: "sales@assetflow.dev",
      name: "Raj",
      role: "employee" as const,
      department_id: sales.id,
    },
  ];

  const usersByEmail: Record<string, { id: number }> = {};
  for (const u of userDefs) {
    const existing = await prisma.users.findUnique({ where: { email: u.email } });
    const row = await prisma.users.upsert({
      where: { email: u.email },
      create: {
        name: u.name,
        email: u.email,
        password_hash,
        role: u.role,
        department_id: u.department_id,
        status: "active",
      },
      update: {
        name: u.name,
        password_hash,
        role: u.role,
        department_id: u.department_id,
        status: "active",
      },
    });
    usersByEmail[u.email] = row;
    log(existing ? "updated" : "created", "users", u.email);
  }

  const admin = usersByEmail["admin@assetflow.dev"]!;
  const manager = usersByEmail["manager@assetflow.dev"]!;
  const head = usersByEmail["head@assetflow.dev"]!;
  const priya = usersByEmail["employee@assetflow.dev"]!;
  const raj = usersByEmail["sales@assetflow.dev"]!;

  await prisma.departments.update({
    where: { id: engineering.id },
    data: { head_user_id: head.id },
  });

  // --- categories + custom fields ---
  const laptopCat = await prisma.asset_categories.upsert({
    where: { name: "Laptop" },
    create: { name: "Laptop" },
    update: {},
  });
  const roomCat = await prisma.asset_categories.upsert({
    where: { name: "Meeting Room" },
    create: { name: "Meeting Room" },
    update: {},
  });
  console.log(`[seed] upserted categories Laptop(#${laptopCat.id}), Meeting Room(#${roomCat.id})`);

  for (const field of [
    { category_id: laptopCat.id, field_name: "RAM", field_type: "text" as const },
    { category_id: roomCat.id, field_name: "Capacity", field_type: "number" as const },
  ]) {
    const existing = await prisma.category_custom_fields.findUnique({
      where: {
        category_id_field_name: {
          category_id: field.category_id,
          field_name: field.field_name,
        },
      },
    });
    await prisma.category_custom_fields.upsert({
      where: {
        category_id_field_name: {
          category_id: field.category_id,
          field_name: field.field_name,
        },
      },
      create: field,
      update: { field_type: field.field_type },
    });
    log(existing ? "skipped" : "created", "category_custom_fields", field.field_name);
  }

  // --- assets ---
  async function ensureAsset(data: {
    asset_tag: string;
    name: string;
    category_id: number;
    status: "Available" | "Allocated";
    is_bookable?: boolean;
    location?: string;
    serial_number?: string;
    custom_fields?: object;
  }) {
    const existing = await prisma.assets.findUnique({ where: { asset_tag: data.asset_tag } });
    const row = await prisma.assets.upsert({
      where: { asset_tag: data.asset_tag },
      create: {
        asset_tag: data.asset_tag,
        qr_code: data.asset_tag,
        name: data.name,
        category_id: data.category_id,
        status: data.status,
        is_bookable: data.is_bookable ?? false,
        location: data.location ?? null,
        serial_number: data.serial_number ?? null,
        custom_fields: data.custom_fields ?? undefined,
        condition: "Good",
      },
      update: {
        name: data.name,
        category_id: data.category_id,
        is_bookable: data.is_bookable ?? false,
        location: data.location ?? null,
        serial_number: data.serial_number ?? null,
        qr_code: data.asset_tag,
        // Only set demo status when creating; on update keep current status if already seeded
        ...(existing ? {} : { status: data.status }),
      },
    });
    // On first create upsert already set status; if existing but we need Allocated for AF-0001 demo, sync when no active alloc conflict — keep simple: update status on upsert create only. For AF-0001 ensure Allocated after allocation step.
    log(existing ? "skipped" : "created", "assets", data.asset_tag);
    return row;
  }

  const laptop = await ensureAsset({
    asset_tag: "AF-0001",
    name: "MacBook Pro 14",
    category_id: laptopCat.id,
    status: "Allocated",
    location: "HQ-Floor2",
    serial_number: "SN-LAP-0001",
    custom_fields: { RAM: "16GB" },
  });
  const spare = await ensureAsset({
    asset_tag: "AF-0002",
    name: "Dell Latitude 5440",
    category_id: laptopCat.id,
    status: "Available",
    location: "HQ-Floor2",
    serial_number: "SN-LAP-0002",
  });
  const room = await ensureAsset({
    asset_tag: "AF-ROOM1",
    name: "Conference Room B2",
    category_id: roomCat.id,
    status: "Available",
    is_bookable: true,
    location: "HQ-Floor1",
    custom_fields: { Capacity: 8 },
  });

  // document for laptop
  const docUrl = "https://example.com/docs/AF-0001-warranty.pdf";
  const existingDoc = await prisma.asset_documents.findFirst({
    where: { asset_id: laptop.id, file_url: docUrl },
  });
  if (!existingDoc) {
    await prisma.asset_documents.create({
      data: { asset_id: laptop.id, file_url: docUrl, doc_type: "warranty" },
    });
    log("created", "asset_documents", docUrl);
  } else {
    log("skipped", "asset_documents", docUrl);
  }

  // --- allocation (Priya holds AF-0001, past return) ---
  const pastReturn = new Date();
  pastReturn.setDate(pastReturn.getDate() - 7);
  pastReturn.setHours(0, 0, 0, 0);

  let allocation = await prisma.allocations.findFirst({
    where: {
      asset_id: laptop.id,
      employee_id: priya.id,
      status: { in: ["active", "overdue"] },
    },
  });
  if (!allocation) {
    allocation = await prisma.allocations.create({
      data: {
        asset_id: laptop.id,
        employee_id: priya.id,
        department_id: engineering.id,
        expected_return_date: pastReturn,
        status: "active",
        condition_notes_out: "Seed: issued to Priya",
      },
    });
    await prisma.assets.update({
      where: { id: laptop.id },
      data: { status: "Allocated" },
    });
    log("created", "allocations", `AF-0001→Priya#${allocation.id}`);
  } else {
    log("skipped", "allocations", `AF-0001→Priya#${allocation.id}`);
  }

  // --- transfer requested Priya → Raj ---
  const existingTransfer = await prisma.transfer_requests.findFirst({
    where: {
      asset_id: laptop.id,
      from_user_id: priya.id,
      to_user_id: raj.id,
      status: "requested",
    },
  });
  if (!existingTransfer) {
    const tr = await prisma.transfer_requests.create({
      data: {
        asset_id: laptop.id,
        from_user_id: priya.id,
        to_user_id: raj.id,
        requested_by: raj.id,
        status: "requested",
      },
    });
    log("created", "transfer_requests", `#${tr.id}`);
  } else {
    log("skipped", "transfer_requests", `#${existingTransfer.id}`);
  }

  // --- booking on room ---
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(11, 0, 0, 0);

  const existingBooking = await prisma.bookings.findFirst({
    where: {
      resource_asset_id: room.id,
      booked_by_user_id: priya.id,
      start_time: start,
      end_time: end,
    },
  });
  if (!existingBooking) {
    const booking = await prisma.bookings.create({
      data: {
        resource_asset_id: room.id,
        booked_by_user_id: priya.id,
        department_id: engineering.id,
        start_time: start,
        end_time: end,
        status: "upcoming",
      },
    });
    log("created", "bookings", `#${booking.id}`);
  } else {
    log("skipped", "bookings", `#${existingBooking.id}`);
  }

  // --- maintenance on spare ---
  const maintDesc = "Seed: fan noise / thermal throttle";
  const existingMaint = await prisma.maintenance_requests.findFirst({
    where: {
      asset_id: spare.id,
      raised_by: priya.id,
      issue_description: maintDesc,
    },
  });
  if (!existingMaint) {
    const maint = await prisma.maintenance_requests.create({
      data: {
        asset_id: spare.id,
        raised_by: priya.id,
        issue_description: maintDesc,
        priority: "high",
        status: "pending",
      },
    });
    log("created", "maintenance_requests", `#${maint.id}`);
  } else {
    log("skipped", "maintenance_requests", `#${existingMaint.id}`);
  }

  // --- audit cycle ---
  const auditName = "Q3 Demo Audit";
  let cycle = await prisma.audit_cycles.findFirst({ where: { name: auditName } });
  if (!cycle) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);
    cycle = await prisma.audit_cycles.create({
      data: {
        name: auditName,
        scope_department_id: engineering.id,
        scope_location: "HQ-Floor2",
        start_date: today,
        end_date: endDate,
        status: "open",
        created_by: admin.id,
      },
    });
    log("created", "audit_cycles", auditName);
  } else {
    log("skipped", "audit_cycles", auditName);
  }

  const existingAuditor = await prisma.audit_cycle_auditors.findUnique({
    where: {
      audit_cycle_id_auditor_user_id: {
        audit_cycle_id: cycle.id,
        auditor_user_id: manager.id,
      },
    },
  });
  if (!existingAuditor) {
    await prisma.audit_cycle_auditors.create({
      data: { audit_cycle_id: cycle.id, auditor_user_id: manager.id },
    });
    log("created", "audit_cycle_auditors", `manager→#${cycle.id}`);
  } else {
    log("skipped", "audit_cycle_auditors", `manager→#${cycle.id}`);
  }

  for (const item of [
    {
      asset_id: laptop.id,
      result: "verified" as const,
      notes: "Seed: present at desk",
      verified_by: manager.id,
      verified_at: new Date(),
    },
    {
      asset_id: spare.id,
      result: "missing" as const,
      notes: "Seed: not located",
      verified_by: manager.id,
      verified_at: new Date(),
    },
  ]) {
    const existingItem = await prisma.audit_items.findUnique({
      where: {
        audit_cycle_id_asset_id: {
          audit_cycle_id: cycle.id,
          asset_id: item.asset_id,
        },
      },
    });
    if (!existingItem) {
      await prisma.audit_items.create({
        data: {
          audit_cycle_id: cycle.id,
          asset_id: item.asset_id,
          result: item.result,
          notes: item.notes,
          verified_by: item.verified_by,
          verified_at: item.verified_at,
        },
      });
      log("created", "audit_items", `asset#${item.asset_id}`);
    } else {
      log("skipped", "audit_items", `asset#${item.asset_id}`);
    }
  }

  // --- notifications ---
  const notifs = [
    {
      user_id: priya.id,
      type: "allocation",
      message: "Seed: AF-0001 allocated to you",
      related_entity_type: "allocation",
      related_entity_id: allocation.id,
    },
    {
      user_id: manager.id,
      type: "maintenance",
      message: "Seed: maintenance pending on AF-0002",
      related_entity_type: "maintenance_request",
      related_entity_id: null as number | null,
    },
    {
      user_id: raj.id,
      type: "transfer",
      message: "Seed: transfer requested for AF-0001",
      related_entity_type: "transfer_request",
      related_entity_id: null,
    },
  ];
  for (const n of notifs) {
    const existing = await prisma.notifications.findFirst({
      where: {
        user_id: n.user_id,
        type: n.type,
        message: n.message,
      },
    });
    if (!existing) {
      await prisma.notifications.create({
        data: {
          user_id: n.user_id,
          type: n.type,
          message: n.message,
          related_entity_type: n.related_entity_type,
          related_entity_id: n.related_entity_id,
          is_read: false,
        },
      });
      log("created", "notifications", n.type);
    } else {
      log("skipped", "notifications", n.type);
    }
  }

  // --- activity logs ---
  const logs = [
    {
      user_id: admin.id,
      action: "SEED_RUN",
      entity_type: "system",
      entity_id: null as number | null,
      metadata: { source: "prisma/seed.ts" },
    },
    {
      user_id: manager.id,
      action: "ASSET_REGISTERED",
      entity_type: "asset",
      entity_id: laptop.id,
      metadata: { asset_tag: "AF-0001" },
    },
    {
      user_id: priya.id,
      action: "ALLOCATION_CREATED",
      entity_type: "allocation",
      entity_id: allocation.id,
      metadata: { asset_tag: "AF-0001" },
    },
  ];
  for (const entry of logs) {
    const existing = await prisma.activity_logs.findFirst({
      where: {
        user_id: entry.user_id,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
      },
    });
    if (!existing) {
      await prisma.activity_logs.create({ data: entry });
      log("created", "activity_logs", entry.action);
    } else {
      log("skipped", "activity_logs", entry.action);
    }
  }

  console.log("\n[seed] done. Demo password for all users: Passw0rd!");
  console.log(
    "[seed] accounts: admin@ / manager@ / head@ / employee@ (Priya) / sales@ (Raj) @assetflow.dev",
  );
}

seed()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
