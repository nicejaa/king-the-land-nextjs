/**
 * Permission helper functions
 */

/**
 * Check if user has a specific permission
 * @param {string[]} userPermissions - Array of permission codes
 * @param {string} permission - Required permission code
 * @returns {boolean}
 */
export function hasPermission(userPermissions, permission) {
  if (!userPermissions || !permission) return false;
  return userPermissions.includes(permission);
}

/**
 * Check if user has any of the given permissions
 * @param {string[]} userPermissions
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function hasAnyPermission(userPermissions, permissions) {
  if (!userPermissions || !permissions?.length) return false;
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if user has all of the given permissions
 * @param {string[]} userPermissions
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function hasAllPermissions(userPermissions, permissions) {
  if (!userPermissions || !permissions?.length) return false;
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * Check if user is super admin
 * @param {{ role: string }} user
 * @returns {boolean}
 */
export function isSuperAdmin(user) {
  return user?.role === "SUPER_ADMIN";
}

/**
 * Get permission check function bound to a user's permissions
 * @param {string[]} userPermissions
 * @returns {{ can: (p: string) => boolean; canAny: (p: string[]) => boolean; canAll: (p: string[]) => boolean }}
 */
export function createPermissionChecker(userPermissions) {
  return {
    can: (permission) => hasPermission(userPermissions, permission),
    canAny: (permissions) => hasAnyPermission(userPermissions, permissions),
    canAll: (permissions) => hasAllPermissions(userPermissions, permissions),
  };
}
