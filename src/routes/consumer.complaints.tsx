import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, MapPin, Plus, Search, User, Zap } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/app/badges";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { STATUSES, formatDate } from "@/utils/helpers";
import type { Status } from "@/types";

export const Route = createFileRoute("/consumer/complaints")({
  head: () => meta("My Complaints", "Search, filter and track all complaints you have submitted."),
  component: MyComplaints,
});

function MyComplaints() {
  const { complaints, currentUser, userById } = useStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const mine = useMemo(
    () => complaints.filter((c) => c.consumerId === currentUser?.id),
    [complaints, currentUser?.id],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine.filter((c) => {
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesQuery =
        !q ||
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [mine, query, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Complaints</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, filter, and follow live progress on every electricity issue you&apos;ve reported.
          </p>
        </div>
        <Link
          to="/consumer/submit"
          className="inline-flex h-11 w-fit items-center gap-2 rounded-full bg-foreground px-6 text-xs font-bold uppercase tracking-[0.14em] text-background transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New Complaint
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-3xl border border-foreground/8 bg-card p-4 shadow-xs lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              statusFilter === "all"
                ? "bg-foreground text-background"
                : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            All ({mine.length})
          </button>
          {STATUSES.map((s) => {
            const count = mine.filter((c) => c.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                  statusFilter === s
                    ? "bg-foreground text-background"
                    : "bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ID, title, address…"
            className="h-10 w-full rounded-full border border-foreground/12 bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Complaints Card Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-foreground/15 bg-card p-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <Zap className="h-5 w-5" />
          </span>
          <p className="mt-4 text-base font-bold text-foreground">
            {mine.length === 0 ? "You haven't submitted any complaints yet" : "No matching complaints"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {mine.length === 0
              ? "Report your first electricity issue and track it from submission to resolution."
              : "Try clearing your search or switching the status filter."}
          </p>
          {mine.length === 0 && (
            <Link
              to="/consumer/submit"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-7 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Submit First Complaint
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => {
            const worker = userById(c.workerId);
            return (
              <Link
                key={c.id}
                to="/complaints/$id"
                params={{ id: c.id }}
                className="group flex flex-col justify-between rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs transition-colors hover:border-foreground/25"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-surface px-3 py-1 font-mono text-xs font-bold text-foreground">
                      {c.id}
                    </span>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={c.priority} />
                      <StatusBadge status={c.status} />
                    </div>
                  </div>

                  <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground group-hover:text-primary">
                    {c.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {c.address}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> {formatDate(c.createdAt)}
                    </span>
                    {worker && (
                      <span className="inline-flex items-center gap-1.5 text-foreground">
                        <User className="h-3.5 w-3.5 text-primary" /> {worker.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar + Action */}
                <div className="mt-6 border-t border-border/70 pt-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">{c.category}</span>
                    <span className="font-bold text-foreground">{c.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                    <div
                      className={cn("h-full rounded-full", c.status === "Resolved" ? "bg-foreground" : "bg-primary")}
                      style={{ width: `${Math.max(4, c.progress)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-end text-xs font-semibold text-foreground group-hover:text-primary">
                    Open details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
