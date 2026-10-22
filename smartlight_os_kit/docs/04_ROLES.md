# RBAC permission matrix
Roles: PLATFORM_ADMIN (global); ULB_ADMIN (assigned ULB); OPERATIONS_MANAGER; CONTROL_OPERATOR; MAINTENANCE_SUPERVISOR; TECHNICIAN; AUDITOR.
Permissions: org.manage, users.manage, assets.read/write, devices.read/configure/command, schedules.manage, alerts.read/acknowledge, tickets.read/create/assign/resolve, reports.read/export, simulator.manage, audit.read, integrations.manage.
Enforce scope server-side by tenant and ULB. Technicians see only assigned tickets unless granted broader asset access. Auditors have no write access. High-risk bulk commands may require dual authorization (configurable).
