-- Fix production admin permissions
-- Ensure Global_Admin role has wildcard permission

-- Step 1: Create or get Global_Admin role
INSERT INTO "system_admin_roles" (id, name, description, "isBuiltIn", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Global_Admin', 'Full system administrator with all permissions', true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- Step 2: Create wildcard permission if it doesn't exist
INSERT INTO "system_admin_permissions" 
(id, claim, description, category, action, "operationType", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'system_admin_portal:*',
  'Full system admin access to all portal features',
  'system_admin_portal',
  '*',
  'ALL',
  now(),
  now()
)
ON CONFLICT (claim) DO NOTHING;

-- Step 3: Assign wildcard permission to Global_Admin role
INSERT INTO "system_admin_role_permissions" (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, now()
FROM "system_admin_roles" r, "system_admin_permissions" p
WHERE r.name = 'Global_Admin' 
  AND p.claim = 'system_admin_portal:*'
  AND NOT EXISTS (
    SELECT 1 FROM "system_admin_role_permissions" srp
    WHERE srp."roleId" = r.id AND srp."permissionId" = p.id
  );

-- Verify result
SELECT 
  r.name as role_name,
  COUNT(p.id) as permission_count,
  STRING_AGG(p.claim, ', ') as claims
FROM "system_admin_roles" r
LEFT JOIN "system_admin_role_permissions" srp ON r.id = srp."roleId"
LEFT JOIN "system_admin_permissions" p ON srp."permissionId" = p.id
WHERE r.name = 'Global_Admin'
GROUP BY r.id, r.name;
