"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navItems } from "config/navigation";
import { usePermissions } from "hooks/use-permissions";
import { siteConfig } from "config/site";
import { cn } from "lib/utils";
import { ScrollArea } from "components/ui/scroll-area";
import { ChevronDownIcon, HardHatIcon } from "lucide-react";

export function Sidebar({ className }) {
  const pathname = usePathname();
  const { can, isSuperAdmin } = usePermissions();
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (title) =>
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  const isActive = (href) =>
    pathname === href || pathname.startsWith(href + "/");

  const filteredItems = navItems.filter((item) => {
    if (!item.permission) return true;
    if (isSuperAdmin()) return true;
    return can(item.permission);
  });

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r bg-sidebar",
        className
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HardHatIcon className="size-4" />
        </div>
        <span className="font-semibold text-sm leading-tight">
          {siteConfig.name}
        </span>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            if (item.children) {
              const isGroupOpen =
                openGroups[item.title] ??
                item.children.some((c) => isActive(c.href));
              const filteredChildren = item.children.filter((child) => {
                if (!child.permission) return true;
                if (isSuperAdmin()) return true;
                return can(child.permission);
              });
              if (filteredChildren.length === 0) return null;
              return (
                <div key={item.title}>
                  <button
                    onClick={() => toggleGroup(item.title)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isGroupOpen
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 text-left">{item.title}</span>
                    <ChevronDownIcon
                      className={cn(
                        "size-4 transition-transform",
                        isGroupOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isGroupOpen && (
                    <div className="ml-7 mt-1 space-y-1">
                      {filteredChildren.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isActive(child.href)
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                              : "text-sidebar-foreground"
                          )}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive(item.href)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
