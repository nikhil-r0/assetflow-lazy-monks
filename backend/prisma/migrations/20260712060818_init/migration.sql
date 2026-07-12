-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'asset_manager', 'department_head', 'employee');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "DeptStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('text', 'number', 'date', 'boolean');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('Available', 'Allocated', 'Reserved', 'Under_Maintenance', 'Lost', 'Retired', 'Disposed');

-- CreateEnum
CREATE TYPE "AllocStatus" AS ENUM ('active', 'returned', 'overdue');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('requested', 'approved', 'rejected', 'completed');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "MaintStatus" AS ENUM ('pending', 'approved', 'rejected', 'technician_assigned', 'in_progress', 'resolved');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('verified', 'missing', 'damaged');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'employee',
    "department_id" INTEGER,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "parent_department_id" INTEGER,
    "head_user_id" INTEGER,
    "status" "DeptStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_custom_fields" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "field_name" VARCHAR(80) NOT NULL,
    "field_type" "FieldType" NOT NULL DEFAULT 'text',

    CONSTRAINT "category_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "asset_tag" VARCHAR(20) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "serial_number" VARCHAR(120),
    "acquisition_date" DATE,
    "acquisition_cost" DECIMAL(12,2),
    "condition" VARCHAR(60),
    "location" VARCHAR(160),
    "custom_fields" JSONB,
    "is_bookable" BOOLEAN NOT NULL DEFAULT false,
    "qr_code" VARCHAR(255),
    "status" "AssetStatus" NOT NULL DEFAULT 'Available',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_documents" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "doc_type" VARCHAR(60),

    CONSTRAINT "asset_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocations" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "employee_id" INTEGER,
    "department_id" INTEGER,
    "allocated_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_return_date" DATE,
    "actual_return_date" TIMESTAMPTZ,
    "status" "AllocStatus" NOT NULL DEFAULT 'active',
    "condition_notes_out" VARCHAR(500),
    "condition_notes_in" VARCHAR(500),

    CONSTRAINT "allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_requests" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "from_user_id" INTEGER,
    "to_user_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "status" "TransferStatus" NOT NULL DEFAULT 'requested',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "resource_asset_id" INTEGER NOT NULL,
    "booked_by_user_id" INTEGER NOT NULL,
    "department_id" INTEGER,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "raised_by" INTEGER NOT NULL,
    "issue_description" VARCHAR(1000) NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'medium',
    "photo_url" VARCHAR(500),
    "status" "MaintStatus" NOT NULL DEFAULT 'pending',
    "approved_by" INTEGER,
    "technician_name" VARCHAR(120),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_cycles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "scope_department_id" INTEGER,
    "scope_location" VARCHAR(160),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'open',
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "audit_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_cycle_auditors" (
    "id" SERIAL NOT NULL,
    "audit_cycle_id" INTEGER NOT NULL,
    "auditor_user_id" INTEGER NOT NULL,

    CONSTRAINT "audit_cycle_auditors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_items" (
    "id" SERIAL NOT NULL,
    "audit_cycle_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "result" "AuditResult",
    "notes" VARCHAR(500),
    "verified_by" INTEGER,
    "verified_at" TIMESTAMPTZ,

    CONSTRAINT "audit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(60) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "related_entity_type" VARCHAR(60),
    "related_entity_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(60) NOT NULL,
    "entity_id" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "departments_parent_department_id_idx" ON "departments"("parent_department_id");

-- CreateIndex
CREATE INDEX "departments_head_user_id_idx" ON "departments"("head_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_name_key" ON "asset_categories"("name");

-- CreateIndex
CREATE INDEX "category_custom_fields_category_id_idx" ON "category_custom_fields"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_custom_fields_category_id_field_name_key" ON "category_custom_fields"("category_id", "field_name");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_tag_key" ON "assets"("asset_tag");

-- CreateIndex
CREATE INDEX "assets_category_id_idx" ON "assets"("category_id");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_location_idx" ON "assets"("location");

-- CreateIndex
CREATE INDEX "assets_serial_number_idx" ON "assets"("serial_number");

-- CreateIndex
CREATE INDEX "asset_documents_asset_id_idx" ON "asset_documents"("asset_id");

-- CreateIndex
CREATE INDEX "allocations_asset_id_idx" ON "allocations"("asset_id");

-- CreateIndex
CREATE INDEX "allocations_employee_id_idx" ON "allocations"("employee_id");

-- CreateIndex
CREATE INDEX "allocations_department_id_idx" ON "allocations"("department_id");

-- CreateIndex
CREATE INDEX "allocations_status_idx" ON "allocations"("status");

-- CreateIndex
CREATE INDEX "transfer_requests_asset_id_idx" ON "transfer_requests"("asset_id");

-- CreateIndex
CREATE INDEX "transfer_requests_status_idx" ON "transfer_requests"("status");

-- CreateIndex
CREATE INDEX "bookings_resource_asset_id_start_time_end_time_idx" ON "bookings"("resource_asset_id", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "maintenance_requests_asset_id_idx" ON "maintenance_requests"("asset_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");

-- CreateIndex
CREATE INDEX "audit_cycles_status_idx" ON "audit_cycles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "audit_cycle_auditors_audit_cycle_id_auditor_user_id_key" ON "audit_cycle_auditors"("audit_cycle_id", "auditor_user_id");

-- CreateIndex
CREATE INDEX "audit_items_audit_cycle_id_idx" ON "audit_items"("audit_cycle_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_items_audit_cycle_id_asset_id_key" ON "audit_items"("audit_cycle_id", "asset_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_user_id_fkey" FOREIGN KEY ("head_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_custom_fields" ADD CONSTRAINT "category_custom_fields_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_asset_id_fkey" FOREIGN KEY ("resource_asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booked_by_user_id_fkey" FOREIGN KEY ("booked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycles" ADD CONSTRAINT "audit_cycles_scope_department_id_fkey" FOREIGN KEY ("scope_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycles" ADD CONSTRAINT "audit_cycles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycle_auditors" ADD CONSTRAINT "audit_cycle_auditors_audit_cycle_id_fkey" FOREIGN KEY ("audit_cycle_id") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycle_auditors" ADD CONSTRAINT "audit_cycle_auditors_auditor_user_id_fkey" FOREIGN KEY ("auditor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_items" ADD CONSTRAINT "audit_items_audit_cycle_id_fkey" FOREIGN KEY ("audit_cycle_id") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_items" ADD CONSTRAINT "audit_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_items" ADD CONSTRAINT "audit_items_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
