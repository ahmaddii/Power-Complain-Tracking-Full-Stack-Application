import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell, BarChart3, ClipboardList, Copy, FilePlus2, HardHat, Home, LayoutDashboard, LogOut, Menu, Settings, Users, Wrench, Zap, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { homeFor, useStore } from "@/hooks/use-store";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/helpers";

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };
const NAV: Record<Role, NavItem[]> = {
  consumer: [
    { to: "/consumer", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/consumer/submit", label: "Submit Complaint", icon: FilePlus2 },
    { to: "/consumer/complaints", label: "My Complaints", icon: ClipboardList },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/complaints", label: "All Complaints", icon: ClipboardList },
    { to: "/admin/duplicates", label: "Duplicate Review", icon: Copy },
    { to: "/admin/consumers", label: "Consumers", icon: Users },
    { to: "/admin/workers", label: "Field Workers", icon: HardHat },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  ],
  worker: [
    { to: "/worker", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/worker/tasks", label: "My Tasks", icon: Wrench },
  ],
};
const COMMON: NavItem[] = [
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile & Settings", icon: Settings },
];
const ROLE_LABEL: Record<Role, string> = { consumer: "Consumer", admin: "Administrator", worker: "Field Worker" };

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 font-bold tracking-tight", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Zap className="h-4 w-4 fill-current" />
      </span>
      <span className="text-sm uppercase tracking-[0.12em]">Power-Track</span>
    </Link>
  );
}

function NotificationBell() {
  const { myNotifications, markRead, markAllRead } = useStore();
  const navigate = useNavigate();
  const unread = myNotifications.filter((n) => !n.read).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full border border-foreground/10 bg-card hover:border-foreground/30"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-1">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <button className="text-xs font-medium text-primary hover:underline" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {myNotifications.length === 0 && (
          <p className="p-5 text-center text-sm text-muted-foreground">No notifications yet</p>
        )}
        {myNotifications.slice(0, 5).map((n) => (
          <DropdownMenuItem
            key={n.id}
            className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
            onClick={() => {
              markRead(n.id);
              if (n.complaintId) navigate({ to: "/complaints/$id", params: { id: n.complaintId } });
            }}
          >
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
            <div className="min-w-0">
              <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
              <p className="truncate text-xs text-muted-foreground">{n.message}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(n.at)}</p>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notifications" className="justify-center rounded-xl py-2 text-xs font-semibold text-primary">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children, role }: { children: ReactNode; role?: Role }) {
  const { currentUser, hydrated, logout, myNotifications, users } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const unreadCount = myNotifications.filter((n) => !n.read).length;
  const pendingWorkersCount = users.filter((u) => u.role === "worker" && !u.active).length;

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser) navigate({ to: "/login" });
    else if (role && currentUser.role !== role) navigate({ to: homeFor(currentUser.role) });
  }, [hydrated, currentUser, role, navigate]);

  if (!hydrated || !currentUser || (role && currentUser.role !== role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const items = [...NAV[currentUser.role], ...COMMON];
  const isActive = (i: NavItem) => (i.exact ? path === i.to : path.startsWith(i.to));
  const initials = currentUser.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div>
        <div className="hidden px-2 pb-5 pt-1 lg:block">
          <Logo />
        </div>
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {ROLE_LABEL[currentUser.role]}
        </p>
        <nav className="flex flex-col gap-1.5">
          {items.map((i) => {
            const active = isActive(i);
            return (
              <Link
                key={i.to}
                to={i.to}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                <i.icon className={cn("h-4 w-4", active && "text-primary")} />
                <span className="flex-1">{i.label}</span>
                {i.to === "/notifications" && unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
                {i.to === "/admin/workers" && pendingWorkersCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {pendingWorkersCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-6 border-t border-foreground/8 pt-4">
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground">{currentUser.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABEL[currentUser.role]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate({ to: "/login" });
          }}
          className="mt-2 flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface text-foreground">
      {/* Desktop Left Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-foreground/8 bg-background lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-foreground/10 bg-background shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-foreground/8 px-4">
              <Logo />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="h-[calc(100vh-4rem)] overflow-y-auto">{sidebarContent}</div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only top bar — desktop uses the left sidebar exclusively */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-foreground/8 bg-background px-4 sm:px-6 lg:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Logo />
          </div>

          <NotificationBell />
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
