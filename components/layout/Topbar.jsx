"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import axios from "axios";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "components/ui/dropdown-menu";
import { Button } from "components/ui/button";
import { getInitials } from "lib/utils";
import {
  SunIcon,
  MoonIcon,
  LogOutIcon,
  UserIcon,
  MenuIcon,
  BellIcon,
} from "lucide-react";
import { ROLE_LABELS } from "constants/roles";

function useBellCount() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  const { data: session } = useSession();

  const fetchCount = () => {
    if (!session?.user) return;
    axios.get("/api/notifications?unread=true&limit=1")
      .then((r) => setCount(r.data?.unreadCount ?? 0))
      .catch(() => {});
  };

  useEffect(() => {
    fetchCount();
  }, [pathname, session?.user?.id]);

  useEffect(() => {
    const timer = setInterval(fetchCount, 30_000);
    return () => clearInterval(timer);
  }, [session?.user?.id]);

  return count;
}

export function Topbar({ onMenuClick }) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const user = session?.user;
  const unreadCount = useBellCount();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <MenuIcon className="size-5" />
      </Button>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <SunIcon className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <Link href="/notifications">
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <BellIcon className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">
                  {getInitials(user?.name ?? user?.username ?? "?")}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:block max-w-32 truncate">
                {user?.name ?? user?.username}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.username}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[user?.role] ?? user?.role}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <UserIcon className="size-4 mr-2" />
                โปรไฟล์
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="cursor-pointer"
            >
              <LogOutIcon className="size-4 mr-2" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
