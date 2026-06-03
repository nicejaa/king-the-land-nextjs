"use client";

import { useSession } from "next-auth/react";
import { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } from "lib/permissions";

/**
 * Hook for checking user permissions in client components
 */
export function usePermissions() {
  const { data: session } = useSession();
  const user = session?.user;
  const permissions = user?.permissions ?? [];

  return {
    user,
    permissions,
    can: (permission) => {
      if (!user) return false;
      if (isSuperAdmin(user)) return true;
      return hasPermission(permissions, permission);
    },
    canAny: (perms) => {
      if (!user) return false;
      if (isSuperAdmin(user)) return true;
      return hasAnyPermission(permissions, perms);
    },
    canAll: (perms) => {
      if (!user) return false;
      if (isSuperAdmin(user)) return true;
      return hasAllPermissions(permissions, perms);
    },
    isSuperAdmin: () => isSuperAdmin(user),
    isAuthenticated: !!user,
  };
}
