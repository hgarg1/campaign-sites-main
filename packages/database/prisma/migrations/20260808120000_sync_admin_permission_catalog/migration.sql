-- Sync the system admin permission catalog into the database.
--
-- Guarded routes check claims that were never present as rows in
-- system_admin_permissions, which meant no role -- including Global_Admin --
-- could hold them, and every route behind one returned 403 for every admin.
--
-- Generated from apps/web/public/system-admin-portal-claims.json.
-- Idempotent: safe to re-run, never overwrites an existing row.

INSERT INTO "system_admin_permissions"
  (id, claim, description, category, action, "operationType", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'system_admin_portal:analytics:configure', 'Configure analytics settings', 'analytics', 'configure', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:analytics:export_data', 'Export analytics data', 'analytics', 'export_data', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:analytics:read', 'Read analytics data', 'analytics', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:analytics:view', 'View analytics dashboards', 'analytics', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:analytics:view_dashboard', 'View analytics dashboard', 'analytics', 'view_dashboard', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:analytics:view_metrics', 'View system metrics', 'analytics', 'view_metrics', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:analytics:view_reports', 'View reports', 'analytics', 'view_reports', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:dashboard:access', 'Access the system admin portal', 'dashboard', 'access', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:dashboard:view_activity_feed', 'View recent activity feed', 'dashboard', 'view_activity_feed', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:dashboard:view_metrics', 'View system metrics (users, orgs, websites)', 'dashboard', 'view_metrics', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:dashboard:view_quick_stats', 'View quick stats (build time, uptime, etc.)', 'dashboard', 'view_quick_stats', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:download:export_data', 'Download/export system data', 'download', 'export_data', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:download:export_reports', 'Download reports', 'download', 'export_reports', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:governance:create_action', 'Create governance action', 'governance', 'create_action', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:governance:create_rule', 'Create governance rule', 'governance', 'create_rule', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:governance:delete_action', 'Delete governance action', 'governance', 'delete_action', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:governance:delete_rule', 'Delete governance rule', 'governance', 'delete_rule', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:governance:read', 'Read governance proposals, rules and configuration', 'governance', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:governance:update_action', 'Update governance action', 'governance', 'update_action', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:governance:update_rule', 'Update governance rule', 'governance', 'update_rule', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:governance:view_actions', 'View governance actions', 'governance', 'view_actions', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:governance:view_rules', 'View governance rules', 'governance', 'view_rules', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:governance:write', 'Modify governance rules, configuration and proposal outcomes', 'governance', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:assign_parent', 'Assign parent organization', 'hierarchy', 'assign_parent', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:collapse_all', 'Collapse all hierarchy nodes', 'hierarchy', 'collapse_all', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:commit_changes', 'Commit hierarchy changes', 'hierarchy', 'commit_changes', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:deactivate', 'Deactivate organization from hierarchy', 'hierarchy', 'deactivate', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:edit_edges', 'Edit hierarchy relationships (drag-drop)', 'hierarchy', 'edit_edges', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:expand_all', 'Expand all hierarchy nodes', 'hierarchy', 'expand_all', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:filter', 'Filter hierarchy by status, party affiliation', 'hierarchy', 'filter', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:reactivate', 'Reactivate organization from hierarchy', 'hierarchy', 'reactivate', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:read', 'Read organization hierarchy trees', 'hierarchy', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:remove_parent', 'Remove parent organization', 'hierarchy', 'remove_parent', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:search', 'Search in hierarchy', 'hierarchy', 'search', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:suspend', 'Suspend organization from hierarchy', 'hierarchy', 'suspend', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:toggle_node', 'Expand/collapse tree nodes', 'hierarchy', 'toggle_node', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:update_settings', 'Update canCreateChildren, maxChildDepth', 'hierarchy', 'update_settings', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:view_details', 'View organization hierarchy details', 'hierarchy', 'view_details', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:view_tree', 'View organization hierarchy tree', 'hierarchy', 'view_tree', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:hierarchy:write', 'Modify organization hierarchy relationships', 'hierarchy', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:jobs:cancel_job', 'Cancel job', 'jobs', 'cancel_job', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:jobs:manage_settings', 'Manage job settings', 'jobs', 'manage_settings', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:jobs:read', 'Read build job records', 'jobs', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:jobs:retry_job', 'Retry failed job', 'jobs', 'retry_job', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:jobs:view_history', 'View job history', 'jobs', 'view_history', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:jobs:view_queue', 'View job queue', 'jobs', 'view_queue', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:jobs:write', 'Cancel and retry build jobs', 'jobs', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:logs:clear_logs', 'Clear logs', 'logs', 'clear_logs', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:logs:export', 'Bulk-export audit trail records', 'logs', 'export', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:logs:export_logs', 'Export logs', 'logs', 'export_logs', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:logs:filter_logs', 'Filter logs', 'logs', 'filter_logs', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:logs:read', 'Read application and audit logs', 'logs', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:logs:search_logs', 'Search logs', 'logs', 'search_logs', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:logs:view_admin_logs', 'View admin action logs', 'logs', 'view_admin_logs', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:logs:view_system_logs', 'View system logs', 'logs', 'view_system_logs', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:master_tenants:create', 'Create master tenant', 'master_tenants', 'create', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:master_tenants:delete', 'Delete master tenant', 'master_tenants', 'delete', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:master_tenants:list', 'View master tenants', 'master_tenants', 'list', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:master_tenants:manage_credentials', 'Manage master tenant credentials', 'master_tenants', 'manage_credentials', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:master_tenants:read', 'Read master tenant mappings', 'master_tenants', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:master_tenants:update', 'Update master tenant', 'master_tenants', 'update', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:master_tenants:view', 'View master tenant details', 'master_tenants', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:master_tenants:write', 'Create, update and delete master tenant mappings', 'master_tenants', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:monitoring:clear_alerts', 'Clear/acknowledge alerts', 'monitoring', 'clear_alerts', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:monitoring:manage_alerts', 'Manage alert settings', 'monitoring', 'manage_alerts', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:monitoring:read', 'Read monitoring health and metrics', 'monitoring', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:monitoring:view', 'View monitoring dashboards', 'monitoring', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:monitoring:view_alerts', 'View system alerts', 'monitoring', 'view_alerts', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:monitoring:view_health', 'View system health status', 'monitoring', 'view_health', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:monitoring:view_logs', 'View system logs', 'monitoring', 'view_logs', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:monitoring:write', 'Acknowledge and resolve monitoring alerts', 'monitoring', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:notifications:manage', 'Manage notification settings', 'notifications', 'manage', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:notifications:send', 'Send notifications', 'notifications', 'send', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:notifications:view', 'View notifications', 'notifications', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:create', 'Create new organization', 'organizations', 'create', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:deactivate', 'Deactivate organization', 'organizations', 'deactivate', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:delete', 'Delete organization', 'organizations', 'delete', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:filter', 'Filter organizations (status, white-label, etc.)', 'organizations', 'filter', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:list', 'View list of all organizations', 'organizations', 'list', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:reactivate', 'Reactivate organization', 'organizations', 'reactivate', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:read', 'Read organization records', 'organizations', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:search', 'Search organizations by name/slug', 'organizations', 'search', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:settings:update', 'Update organization settings', 'organizations', 'update', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:settings:update_status', 'Toggle organization status (suspend/activate)', 'organizations', 'update_status', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:settings:update_white_label', 'Toggle white label setting', 'organizations', 'update_white_label', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:settings:view', 'View organization settings', 'organizations', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:suspend', 'Suspend organization', 'organizations', 'suspend', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:update', 'Update organization profile', 'organizations', 'update', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:view', 'View organization details', 'organizations', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:organizations:write', 'Create and update organization records', 'organizations', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:password:change', 'Change password', 'password', 'change', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:password:reset', 'Request password reset', 'password', 'reset', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:policies:assign', 'Assign policy to organizations', 'policies', 'assign', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:policies:create', 'Create policy', 'policies', 'create', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:policies:delete', 'Delete policy', 'policies', 'delete', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:policies:list', 'View list of policies', 'policies', 'list', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:policies:read', 'Read system permission policies', 'policies', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:policies:unassign', 'Unassign policy from organizations', 'policies', 'unassign', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:policies:update', 'Update policy', 'policies', 'update', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:policies:view', 'View policy details', 'policies', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:policies:write', 'Create, update and delete system permission policies', 'policies', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:profile:change_password', 'Change own password', 'profile', 'change_password', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:profile:update', 'Update own profile', 'profile', 'update', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:profile:view', 'View own profile', 'profile', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:add_override', 'Add permission override', 'rbac', 'add_override', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:add_role_permission', 'Add permission to role', 'rbac', 'add_role_permission', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:apply_default_role', 'Apply default role to new admin', 'rbac', 'apply_default_role', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:assign_role', 'Assign role to admin', 'rbac', 'assign_role', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:create_admin', 'Create new system admin', 'rbac', 'create_admin', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:create_permission', 'Create new permission/claim', 'rbac', 'create_permission', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:create_role', 'Create new role', 'rbac', 'create_role', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:delete_admin', 'Delete system admin', 'rbac', 'delete_admin', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:delete_override', 'Delete permission override', 'rbac', 'delete_override', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:delete_permission', 'Delete permission/claim', 'rbac', 'delete_permission', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:delete_role', 'Delete role', 'rbac', 'delete_role', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:edit_hierarchy', 'Edit admin delegation relationships', 'rbac', 'edit_hierarchy', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:hierarchy', 'Commit admin delegation hierarchy changes', 'rbac', 'hierarchy', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:override', 'Grant or revoke user-level permission overrides', 'rbac', 'override', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:remove_role_permission', 'Remove permission from role', 'rbac', 'remove_role_permission', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:revoke_role', 'Revoke role from admin', 'rbac', 'revoke_role', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:update_admin', 'Update system admin', 'rbac', 'update_admin', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:update_override', 'Update permission override', 'rbac', 'update_override', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:update_permission', 'Update permission/claim', 'rbac', 'update_permission', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:update_role', 'Update role', 'rbac', 'update_role', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:view_admins', 'View system admins', 'rbac', 'view_admins', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:view_hierarchy', 'View admin delegation hierarchy', 'rbac', 'view_hierarchy', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:view_overrides', 'View permission overrides', 'rbac', 'view_overrides', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:view_permissions', 'View all permissions/claims', 'rbac', 'view_permissions', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:rbac:view_roles', 'View all roles', 'rbac', 'view_roles', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:security:manage_2fa', 'Manage two-factor authentication', 'security', 'manage_2fa', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:security:manage_api_keys', 'Manage API keys', 'security', 'manage_api_keys', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:security:manage_ip_whitelist', 'Manage IP whitelist', 'security', 'manage_ip_whitelist', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:security:manage_sessions', 'Manage user sessions', 'security', 'manage_sessions', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:security:read', 'Read security settings and passkey registrations', 'security', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:security:view_settings', 'View security settings', 'security', 'view_settings', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:security:write', 'Modify security settings and passkey registrations', 'security', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:settings:manage_integrations', 'Manage system integrations', 'settings', 'manage_integrations', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:settings:read', 'Read system settings', 'settings', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:settings:update', 'Update system settings', 'settings', 'update', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:settings:view', 'View system settings', 'settings', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:settings:write', 'Modify system settings', 'settings', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:templates:read', 'Read email templates', 'templates', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:templates:send-test', 'Send a test email from a template', 'templates', 'send-test', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:templates:write', 'Create and update email templates', 'templates', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:bulk_delete', 'Delete multiple users', 'users', 'bulk_delete', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:bulk_export', 'Export users to CSV', 'users', 'bulk_export', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:bulk_suspend', 'Suspend multiple users', 'users', 'bulk_suspend', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:bulk_unsuspend', 'Unsuspend multiple users', 'users', 'bulk_unsuspend', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:create', 'Create new user', 'users', 'create', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:delete', 'Delete user', 'users', 'delete', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:filter', 'Filter users by role, status, organization', 'users', 'filter', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:list', 'View list of all users', 'users', 'list', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:manage_organizations', 'Assign/remove user organizations', 'users', 'manage_organizations', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:manage_roles', 'Assign/remove user roles', 'users', 'manage_roles', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:password_reset', 'Reset a user password', 'users', 'password_reset', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:read', 'Read user records', 'users', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:reset_password', 'Reset user password', 'users', 'reset_password', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:search', 'Search users', 'users', 'search', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:suspend', 'Suspend user', 'users', 'suspend', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:unsuspend', 'Unsuspend user', 'users', 'unsuspend', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:update', 'Update user information', 'users', 'update', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:view', 'View user details', 'users', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:users:write', 'Create and update user records', 'users', 'write', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:websites:create', 'Create website', 'websites', 'create', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:websites:delete', 'Delete website', 'websites', 'delete', 'DELETE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:websites:list', 'View all websites', 'websites', 'list', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:websites:reactivate', 'Reactivate website', 'websites', 'reactivate', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:websites:read', 'Read website records', 'websites', 'read', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:websites:suspend', 'Suspend website', 'websites', 'suspend', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:websites:update', 'Update website', 'websites', 'update', 'WRITE', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:websites:view', 'View website details', 'websites', 'view', 'READ', NOW(), NOW()),
  (gen_random_uuid()::text, 'system_admin_portal:websites:write', 'Create, update and rebuild websites', 'websites', 'write', 'WRITE', NOW(), NOW())
ON CONFLICT (claim) DO NOTHING;

-- Ensure the Global_Admin role itself exists before anything depends on it.
INSERT INTO "system_admin_roles" (id, name, description, "isBuiltIn", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Global_Admin',
       'Full system administrator with all permissions', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "system_admin_roles" WHERE name = 'Global_Admin');

-- Global_Admin holds every claim by definition; backfill any it is missing.
INSERT INTO "system_admin_role_permissions" (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid()::text, r.id, p.id, NOW()
FROM "system_admin_roles" r
CROSS JOIN "system_admin_permissions" p
WHERE r.name = 'Global_Admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Every GLOBAL_ADMIN user needs a SystemAdmin record, otherwise permission
-- resolution returns an empty set and the portal answers 403 for them. This was
-- previously an unhandled throw (a 500), so the gap was easy to miss.
INSERT INTO "system_admins" (id, "userId", email, name, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u.id, u.email, COALESCE(u.name, u.email), true, NOW(), NOW()
FROM "users" u
WHERE u.role = 'GLOBAL_ADMIN'
  AND u."deletedAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "system_admins" sa WHERE sa."userId" = u.id)
ON CONFLICT DO NOTHING;

-- ...and each of those admins must hold the Global_Admin role.
INSERT INTO "system_admin_role_assignments" (id, "adminId", "roleId", "assignedAt", "assignedBy", "createdAt")
SELECT gen_random_uuid()::text, sa.id, r.id, NOW(), 'migration', NOW()
FROM "system_admins" sa
JOIN "users" u ON u.id = sa."userId" AND u.role = 'GLOBAL_ADMIN' AND u."deletedAt" IS NULL
CROSS JOIN "system_admin_roles" r
WHERE r.name = 'Global_Admin'
  AND NOT EXISTS (
    SELECT 1 FROM "system_admin_role_assignments" ra WHERE ra."adminId" = sa.id
  )
ON CONFLICT ("adminId", "roleId") DO NOTHING;
