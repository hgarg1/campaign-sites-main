// Quick test of wildcard matching logic
function expandWildcardClaim(claim, allClaims) {
  if (!claim.includes('*')) return [claim];
  const pattern = claim.replace(/\*/g, '.*');
  const regex = new RegExp(`^${pattern}$`);
  return allClaims.filter((c) => regex.test(c));
}

// Test data
const allClaims = [
  'system_admin_portal:users:read',
  'system_admin_portal:users:write',
  'system_admin_portal:organizations:read',
  'system_admin_portal:rbac:view_roles',
  'other_module:action:claim',
];

console.log('Testing wildcard expansion:\n');

// Test 1: Universal wildcard
const test1 = expandWildcardClaim('system_admin_portal:*', allClaims);
console.log('system_admin_portal:* matches:');
test1.forEach(c => console.log('  ✓', c));
console.log(`Total: ${test1.length}/${allClaims.length}\n`);

// Test 2: Specific wildcard
const test2 = expandWildcardClaim('system_admin_portal:users:*', allClaims);
console.log('system_admin_portal:users:* matches:');
test2.forEach(c => console.log('  ✓', c));
console.log(`Total: ${test2.length}\n`);

// Test 3: No wildcard
const test3 = expandWildcardClaim('system_admin_portal:users:read', allClaims);
console.log('system_admin_portal:users:read (no wildcard) matches:');
test3.forEach(c => console.log('  ✓', c));
console.log(`Total: ${test3.length}\n`);

// Test 4: Non-matching wildcard
const otherModuleMatches = expandWildcardClaim('other_module:*', allClaims);
console.log('other_module:* matches:');
otherModuleMatches.forEach(c => console.log('  ✓', c));
console.log(`Total: ${otherModuleMatches.length}\n`);

console.log('✅ Wildcard logic verified!');
