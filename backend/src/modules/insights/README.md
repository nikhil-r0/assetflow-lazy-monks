# Insights Module (Track D)

This module provides the endpoints for the Dashboard, Audit Cycles, Reports, Notifications, and Activity Logs.

## Module Ownership & Responsibilities
- **Dashboard**: Aggregates platform-wide and department-scoped KPIs.
- **Audit**: Handles structured inventory audits, item verification, discrepancies, and cycle closing.
- **Reports**: Generates utilization, maintenance, retirement, department allocation, and booking heatmap charts/CSVs.
- **Notifications & Logging**: Core shared services consumed by all other tracks.

## Endpoint Taxonomies
The following notifications and log activity taxonomy constants are expected:

### Notification Types (`notifications.type`):
- `NOTIF.ALLOCATION`: Sent when an asset is allocated or returned.
- `NOTIF.TRANSFER`: Sent on transfer requests, approvals, or rejections.
- `NOTIF.MAINTENANCE`: Sent when maintenance is raised, approved, or resolved.
- `NOTIF.BOOKING`: Sent when bookings are created, cancelled, or modified.
- `NOTIF.OVERDUE`: Sent when an allocation is overdue.
- `NOTIF.AUDIT_DISCREPANCY`: Sent when discrepancies are found in audit cycles.

### Activity Log Actions (`activity_logs.action`):
- `ACT.CREATE_ASSET`, `ACT.UPDATE_ASSET`, `ACT.DELETE_ASSET`
- `ACT.ALLOCATE_ASSET`, `ACT.RETURN_ASSET`
- `ACT.REQUEST_TRANSFER`, `ACT.APPROVE_TRANSFER`, `ACT.REJECT_TRANSFER`
- `ACT.CREATE_BOOKING`, `ACT.CANCEL_BOOKING`
- `ACT.RAISE_MAINTENANCE`, `ACT.APPROVE_MAINTENANCE`, `ACT.RESOLVE_MAINTENANCE`
- `ACT.CREATE_AUDIT_CYCLE`, `ACT.VERIFY_AUDIT_ITEM`, `ACT.CLOSE_AUDIT_CYCLE`
