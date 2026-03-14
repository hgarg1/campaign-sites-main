# Permissions System - Codebase Analysis Report

## 1. MANAGE PERMISSIONS MODAL (Role Permissions Modal)

### Location
pps/web/src/app/admin/portal/rbac/roles/page.tsx

### State Management
- State Variable: showPermissionsModal (line 31)
- Selected Role State: selectedRole (line 32)
- Selected Permissions State: selectedPermissions (line 33, array of permission IDs)

### Modal UI Structure (Lines 426-514)
- Container: Fixed overlay with bg-black/50 backdrop, z-50
- Title: "Manage Permissions: {selectedRole.name}"
- Search Input: Search permissions by text
- Category Filter Dropdown: Filter by category
- Scrollable Permission List:
  - Each permission has checkbox, claim name, description, operation type
  - Hover effect: hover:bg-gray-50
  - Max height: max-h-96 with overflow
- Action Buttons:
  - Cancel button (closes modal)
  - Save button: Shows count "Save (N selected)"

### Save Handler
- Calls PUT /api/admin/roles/{roleId}/permissions
- Body: { permissionIds: selectedPermissions }
- On success: closes modal, clears errors
- On error: displays error message

---

## 2. INDIVIDUAL USER DETAILS PAGE

### Location
apps/web/src/app/admin/portal/users/[id]/page.tsx

### Route Pattern
- Path: /admin/portal/users/[id]
- Type: Server Component (Next.js dynamic route)
- Params: { params: { id: string } }

### Layout Structure
- Main Layout: AdminLayout wrapper with title and subtitle
- Grid: 3-column layout on large screens (lg:grid-cols-3)
  - Left Column (2/3 width): Main user info
  - Right Sidebar (1/3 width): Permissions and actions

### Components Rendered
1. UserProfile - Displays user name, email
2. UserStatsCard - Shows user statistics
3. UserActivityTimeline - Activity history
4. PermissionsManager - KEY COMPONENT
   - Displays system role (USER | ADMIN | GLOBAL_ADMIN)
   - Shows organization roles
5. UserActionsPanel - Management actions
6. ApiUsagePanel - API usage stats

### User Data Fetching
- Uses useUser(userId) hook
- Uses useSystemAdminPermissions() hook

---

## 3. PERMISSIONSMANAGER COMPONENT

### Location
apps/web/src/components/admin/users/PermissionsManager.tsx

### Component Interface
- systemRole: 'USER' or 'ADMIN' or 'GLOBAL_ADMIN'
- organizations: Array with id, name, memberRole
- onRoleChange: Callback function
- onOrgRoleChange: Callback function

### UI Structure
- Title: "Permissions & Roles"

#### System Role Card
- Background: bg-blue-50 with border-blue-200
- Shows current system role
- Hard-coded permissions list per role type
- Change button triggers onRoleChange callback

#### Organization Roles Section
- Conditional: Only if organizations.length > 0
- Shows each org with name, member role, Edit button

---

## 4. API ENDPOINTS FOR USER PERMISSIONS

### A. Get Current User's System Admin Permissions
GET /api/admin/permissions
Location: apps/web/src/app/api/admin/permissions/route.ts

Response:
{
  allowedClaims: string[],
  deniedClaims: string[],
  allClaims: string[]
}

Features:
- Used by useSystemAdminPermissions hook
- 5-minute client-side cache
- Supports wildcard matching (e.g., 'system_admin_portal:rbac:*')

---

### B. Get Specific Admin's Permissions and Overrides
GET /api/admin/system-admins/[id]/permissions
Location: apps/web/src/app/api/admin/system-admins/[id]/permissions/route.ts

Response:
{
  allPermissions: SystemAdminPermission[],
  rolePermissions: SystemAdminPermission[],
  overrides: SystemAdminPermissionOverride[]
}

---

### C. Manage Role Permissions
GET/PUT /api/admin/roles/[id]/permissions
Location: apps/web/src/app/api/admin/roles/[id]/permissions/route.ts

GET Response: Array of permissions assigned to role
PUT Request: { permissionIds: string[] }

Protection:
- GET requires: system_admin_portal:rbac:view_roles
- PUT requires: system_admin_portal:rbac:add_role_permission OR system_admin_portal:rbac:remove_role_permission
- Cannot modify built-in roles

---

### D. Get Organization Member Effective Permissions
GET /api/tenant/[orgId]/members/[memberId]/permissions
Location: apps/web/src/app/api/tenant/[orgId]/members/[memberId]/permissions/route.ts

Response:
{
  memberId: string,
  userId: string,
  role: string,
  customRole: CustomRole or null,
  permissions: EffectivePermissions
}

Access: ADMIN+ or the member themselves

---

### E. List Available System Admin Permissions
GET /api/admin/rbac/permissions-list
Location: apps/web/src/app/api/admin/rbac/permissions-list/route.ts

Query Parameters:
- search: Search by claim or description
- category: Filter by category

Response: Array of all available system admin permissions

---

## 5. SYSTEM ADMIN PERMISSIONS HOOK

Location: apps/web/src/hooks/use-system-admin-permissions.tsx

API:
const {
  permissions,
  loading,
  error,
  hasPermission,      // (claim: string) => boolean
  hasAnyPermission,   // (claims: string[]) => boolean
  hasAllPermissions,  // (claims: string[]) => boolean
  refetch,
} = useSystemAdminPermissions();

Features:
- Caching: 5-minute cache
- Wildcard Support: Supports wildcard patterns
- Client-side Checking: No API call per permission
- ProtectedByPermission HOC: Wraps components

---

## 6. PERMISSION OVERRIDE ENDPOINTS

### POST /api/admin/system-admins/[id]/permissions
Request Body:
{
  permissionId: string,
  action: 'ALLOW' or 'DENY',
  expiresAt?: string (ISO 8601 date),
  justification: string
}

Audit: Logs as PERMISSION_OVERRIDE_CREATED

### DELETE /api/admin/system-admins/[id]/permissions
Query Parameters:
- permissionId: Required
- justification: Optional

Audit: Logs as PERMISSION_OVERRIDE_DELETED

---

## Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| Manage Permissions Modal | /admin/portal/rbac/roles/page.tsx:426-514 | Manage permissions for roles |
| PermissionsManager | /components/admin/users/PermissionsManager.tsx | Display and manage user permissions |
| User Details Page | /admin/portal/users/[id]/page.tsx | User profile and permissions display |
| Permissions Hook | /hooks/use-system-admin-permissions.tsx | Check user permissions with 5min cache |
| Get User Permissions | GET /api/admin/permissions | Fetch current user permissions |
| Get Admin Permissions | GET /api/admin/system-admins/[id]/permissions | Fetch admin permissions plus overrides |
| Manage Role Permissions | GET/PUT /api/admin/roles/[id]/permissions | Assign permissions to roles |
| Member Permissions | GET /api/tenant/[orgId]/members/[memberId]/permissions | Org-level member permissions |
