"use client";

import { usePermissions } from "hooks/use-permissions";
import { useRouter } from "next/navigation";

/**
 * @param {{
 *   permission?: string;
 *   permissions?: string[];
 *   requireAll?: boolean;
 *   fallback?: React.ReactNode;
 *   redirect?: boolean;
 *   children: React.ReactNode;
 * }} props
 */
export function PermissionGuard({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  redirect = false,
  children,
}) {
  const { can, canAny, canAll, isSuperAdmin } = usePermissions();
  const router = useRouter();

  if (isSuperAdmin()) return children;

  const required = permission ? [permission, ...permissions] : permissions;

  if (required.length === 0) return children;

  const hasAccess = requireAll ? canAll(required) : canAny(required);

  if (!hasAccess) {
    if (redirect) {
      router.push("/403");
      return null;
    }
    return fallback;
  }

  return children;
}
