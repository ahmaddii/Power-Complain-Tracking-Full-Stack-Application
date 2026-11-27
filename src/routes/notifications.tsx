import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bell, CheckCheck, Clock } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/helpers";

export const Route = createFileRoute("/notifications")({
  head: () => meta("Notifications", "Updates on assignments, status changes and resolutions."),
  component: () => (
    <AppShell>
      <Notifications />
    </AppShell>
  ),
});

function Notifications() {
  const { myNotifications, markRead, markAllRead } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "unread">("all");

  const unreadCount = myNotifications.filter((n) => !n.read).length;
  const list = myNotifications.filter((n) => tab === "all" || !n.read);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live updates on your submitted complaints, crew assignments, and resolutions.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex h-11 w-fit items-center gap-2 rounded-full border border-foreground/15 bg-card px-5 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
        )}
      </div>

      {/* Filter Pill Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-foreground/8 bg-card p-3.5 shadow-xs">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={cn(
            "rounded-full px-5 py-2 text-xs font-semibold transition-colors",
            tab === "all"
              ? "bg-foreground text-background"
              : "bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          All ({myNotifications.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("unread")}
          className={cn(
            "rounded-full px-5 py-2 text-xs font-semibold transition-colors",
            tab === "unread"
              ? "bg-foreground text-background"
              : "bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-foreground/15 bg-card p-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <Bell className="h-5 w-5" />
          </span>
          <p className="mt-4 text-base font-bold text-foreground">
            {tab === "unread" ? "You're all caught up" : "No notifications yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "unread"
              ? "Every notification has been read."
              : "Updates will appear here automatically as your complaints move forward."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                markRead(n.id);
                if (n.complaintId) navigate({ to: "/complaints/$id", params: { id: n.complaintId } });
              }}
              className={cn(
                "group flex w-full items-start justify-between gap-4 rounded-3xl border bg-card p-5 text-left shadow-xs transition-colors hover:border-foreground/25 sm:items-center sm:p-6",
                !n.read ? "border-foreground/20" : "border-foreground/8",
              )}
            >
              <div className="flex min-w-0 items-start gap-4">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                    !n.read ? "bg-foreground text-primary" : "bg-surface text-muted-foreground",
                  )}
                >
                  <Bell className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-sm text-foreground sm:text-base", !n.read ? "font-bold" : "font-semibold")}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
                        New
                      </span>
                    )}
                    {n.complaintId && (
                      <span className="rounded-full bg-surface px-2.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                        {n.complaintId}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {formatDateTime(n.at)}
                  </p>
                </div>
              </div>

              {n.complaintId && (
                <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-foreground group-hover:text-primary sm:inline-flex">
                  View <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
