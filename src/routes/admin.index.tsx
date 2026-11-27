import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  Copy,
  HardHat,
  Search,
  Siren,
  UserX,
} from "lucide-react";
import { PriorityBadge, UserAvatar } from "@/components/app/badges";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { CATEGORIES, formatDate } from "@/utils/helpers";

export const Route = createFileRoute("/admin/")({
  head: () => meta("Admin Dashboard", "Overview of all electricity complaints, priorities and assignments."),
  component: AdminDashboard,
});

function ProgressRing({ value, resolved }: { value: number; resolved: boolean }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;

  return (
    <div className="flex items-center gap-2.5">
      <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground/12" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={resolved ? "text-foreground" : "text-primary"}
        />
      </svg>
      <span className="w-9 text-right font-mono text-xs font-bold text-foreground">{clamped}%</span>
    </div>
  );
}

function AdminDashboard() {
  const { complaints, users, userById } = useStore();
  const [search, setSearch] = useState("");
  const [queueTab, setQueueTab] = useState<"all" | "urgent" | "unassigned">("all");

  const open = useMemo(() => complaints.filter((c) => c.status !== "Resolved"), [complaints]);
  const resolvedCount = complaints.length - open.length;
  const inProgressCount = complaints.filter((c) => c.status === "In Progress").length;
  const assignedOrReviewCount = complaints.filter(
    (c) => c.status === "Assigned" || c.status === "Under Review",
  ).length;
  const emergencyCount = open.filter((c) => c.priority === "Emergency").length;
  const unassignedCount = open.filter((c) => !c.workerId).length;
  const dupsCount = complaints.filter((c) => c.duplicateOf && !c.duplicateDismissed).length;

  const workers = users.filter((u) => u.role === "worker");
  const activeWorkers = workers.filter((u) => u.active).length;

  const total = complaints.length;
  const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

  // Solid segmented bar percentages
  const resolvedPct = total > 0 ? (resolvedCount / total) * 100 : 0;
  const inProgPct = total > 0 ? (inProgressCount / total) * 100 : 0;
  const reviewPct = total > 0 ? (assignedOrReviewCount / total) * 100 : 0;

  // Filtered queue list
  const queueList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints
      .filter((c) => {
        if (queueTab === "urgent" && (c.status === "Resolved" || c.priority !== "Emergency")) return false;
        if (queueTab === "unassigned" && (c.status === "Resolved" || Boolean(c.workerId))) return false;
        if (!q) return true;
        const consumer = userById(c.consumerId)?.name.toLowerCase() ?? "";
        return (
          c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          consumer.includes(q)
        );
      })
      .slice(0, 6);
  }, [complaints, queueTab, search, userById]);

  // Category x Day-of-Week Heatmap matrix
  const DAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;
  const DAY_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

  const heatmap = useMemo(() => {
    let maxCell = 0;
    const rows = CATEGORIES.slice(0, 6).map((cat) => {
      const cells = Array(7).fill(0) as number[];
      for (const c of complaints) {
        if (c.category !== cat) continue;
        const d = new Date(c.createdAt).getDay();
        cells[d] += 1;
        if (cells[d] > maxCell) maxCell = cells[d];
      }
      return {
        label: cat.replace(" Issue", "").replace("Damaged ", ""),
        fullLabel: cat,
        cells,
        total: cells.reduce((a, b) => a + b, 0),
      };
    });
    return { rows, maxCell };
  }, [complaints]);

  const [hoveredCell, setHoveredCell] = useState<{ label: string; day: string; count: number } | null>(null);

  const cellColor = (count: number, max: number) => {
    if (count === 0 || max === 0) return "bg-surface text-transparent";
    const ratio = count / max;
    if (ratio <= 0.34) return "bg-accent text-accent-foreground";
    if (ratio <= 0.67) return "bg-primary/70 text-primary-foreground";
    return "bg-primary text-primary-foreground";
  };

  return (
    <div className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-8 lg:p-10">
      {/* Top Executive Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search complaints, ID, zone…"
              className="h-10 w-60 rounded-full border border-foreground/12 bg-background pl-4 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none sm:w-72"
            />
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {dupsCount > 0 && (
            <Link
              to="/admin/duplicates"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-warning/40 bg-warning-soft px-4 text-xs font-bold text-foreground transition-colors hover:border-warning"
            >
              <Copy className="h-3.5 w-3.5 text-warning" />
              <span>{dupsCount} Duplicates</span>
            </Link>
          )}
          <Link
            to="/admin/complaints"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-xs font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <span>Manage All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Hero KPI + Solid Segmented Goal Bar */}
      <div className="mt-9 grid items-center gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <p className="text-5xl font-extrabold leading-none tracking-tight text-foreground sm:text-6xl">{total}</p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">total complaints on platform</p>
        </div>

        <div className="lg:col-span-9">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              <strong className="font-bold text-primary">{resolutionRate}%</strong>{" "}
              <span className="text-muted-foreground">complaints resolved across the network</span>
            </span>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Resolved ({resolvedCount})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-foreground" /> In Progress ({inProgressCount})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-foreground/30" /> Reviewing ({assignedOrReviewCount})
              </span>
            </div>
          </div>

          {/* Solid Segmented Progress Bar (Zero Gradients) */}
          <div className="relative flex h-11 w-full overflow-hidden rounded-2xl bg-surface p-1">
            <div className="flex h-full w-full overflow-hidden rounded-xl">
              {resolvedPct > 0 && (
                <div
                  className="flex h-full items-center bg-primary px-3 text-[11px] font-bold text-primary-foreground transition-all"
                  style={{ width: `${resolvedPct}%` }}
                >
                  {resolvedPct >= 14 ? `${resolvedCount}` : ""}
                </div>
              )}
              {inProgPct > 0 && (
                <div
                  className="flex h-full items-center bg-foreground px-3 text-[11px] font-bold text-background transition-all"
                  style={{ width: `${inProgPct}%` }}
                >
                  {inProgPct >= 14 ? `${inProgressCount}` : ""}
                </div>
              )}
              {reviewPct > 0 && (
                <div
                  className="h-full bg-foreground/25 transition-all"
                  style={{ width: `${reviewPct}%` }}
                />
              )}
              {total === 0 && (
                <div className="flex h-full w-full items-center px-4 text-xs text-muted-foreground">
                  No complaints recorded yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle 3-Column Metrics Strip */}
      <div className="mt-9 grid gap-6 border-y border-foreground/8 py-6 sm:grid-cols-3">
        <div className="flex items-center justify-between gap-4 sm:border-r sm:border-foreground/8 sm:pr-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Open Emergencies</p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
                <Siren className="h-3.5 w-3.5" />
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-foreground">{emergencyCount}</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-destructive">
            {emergencyCount > 0 ? "Urgent action" : "All clear"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 sm:border-r sm:border-foreground/8 sm:pr-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Unassigned Queue</p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <UserX className="h-3.5 w-3.5" />
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-foreground">{unassignedCount}</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary">
            {unassignedCount > 0 ? "Needs crew" : "All assigned"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Field Workers</p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
                <HardHat className="h-3.5 w-3.5" />
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-foreground">{activeWorkers}</span>
            </div>
          </div>
          <Link to="/admin/workers" className="text-xs font-semibold text-muted-foreground hover:text-primary">
            {workers.length} total →
          </Link>
        </div>
      </div>

      {/* Bottom 2-Column Split: Active Queue (8 cols) + Category Trends (4 cols) */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Left: Latest Complaints with Circular Progress Rings */}
        <section className="lg:col-span-8 lg:border-r lg:border-foreground/8 lg:pr-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-lg font-bold tracking-tight">Latest Complaints</h2>
              <span className="text-xs text-muted-foreground">{open.length} open, click to review &amp; assign</span>
            </div>

            <div className="inline-flex rounded-full border border-foreground/10 bg-surface p-1 text-xs font-semibold">
              {(
                [
                  ["all", "All"],
                  ["urgent", "Emergency"],
                  ["unassigned", "Unassigned"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQueueTab(key)}
                  className={cn(
                    "rounded-full px-3.5 py-1 transition-colors",
                    queueTab === key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {queueList.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-foreground/15 bg-background p-10 text-center">
              <p className="text-sm font-semibold text-foreground">No complaints in this view</p>
              <p className="mt-1 text-xs text-muted-foreground">Switch filters or wait for new resident reports.</p>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-foreground/8">
              {queueList.map((c) => {
                const consumer = userById(c.consumerId);
                const worker = userById(c.workerId);

                return (
                  <Link
                    key={c.id}
                    to="/complaints/$id"
                    params={{ id: c.id }}
                    className="group flex flex-wrap items-center justify-between gap-4 py-3.5 transition-colors hover:bg-surface/70 sm:flex-nowrap sm:rounded-2xl sm:px-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      <UserAvatar
                        name={consumer?.name || c.title}
                        avatarUrl={consumer?.avatarUrl}
                        className={cn(
                          "h-10 w-10 rounded-2xl text-xs",
                          c.priority === "Emergency"
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface text-foreground",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                          {c.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{c.id}</span> · {consumer?.name ?? "Consumer"}
                          {worker ? ` → ${worker.name}` : " · Unassigned"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <PriorityBadge priority={c.priority} />
                      <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:inline-flex">
                        <Calendar className="h-3.5 w-3.5" /> {formatDate(c.createdAt)}
                      </span>
                      <ProgressRing value={c.progress} resolved={c.status === "Resolved"} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Issue Trends Heatmap (Category x Day of Week) */}
        <section className="flex flex-col justify-between lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Issue Trends</h2>
            <Link to="/admin/analytics" className="text-xs font-semibold text-primary hover:underline">
              Full analytics →
            </Link>
          </div>

          <div className="mt-5">
            {/* Day Column Headers */}
            <div className="mb-2 grid grid-cols-[5.5rem_repeat(7,minmax(0,1fr))] items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Category</span>
              {DAYS.map((d, i) => (
                <span key={`${d}-${i}`} className="text-center text-[11px] font-bold text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>

            {/* Heatmap Rows */}
            <div className="space-y-1.5">
              {heatmap.rows.map((row) => (
                <div
                  key={row.fullLabel}
                  className="grid grid-cols-[5.5rem_repeat(7,minmax(0,1fr))] items-center gap-1.5"
                >
                  <span className="truncate pr-1 text-xs font-medium text-foreground" title={row.fullLabel}>
                    {row.label}
                  </span>
                  {row.cells.map((count, dayIdx) => (
                    <button
                      key={dayIdx}
                      type="button"
                      onMouseEnter={() =>
                        setHoveredCell({ label: row.fullLabel, day: DAY_FULL[dayIdx], count })
                      }
                      onFocus={() =>
                        setHoveredCell({ label: row.fullLabel, day: DAY_FULL[dayIdx], count })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${row.fullLabel} (${DAY_FULL[dayIdx]}): ${count}`}
                      className={cn(
                        "flex h-8 w-full items-center justify-center rounded-lg font-mono text-[11px] font-bold transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-foreground",
                        cellColor(count, heatmap.maxCell),
                      )}
                    >
                      {count > 0 ? count : ""}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Live Readout + Legend */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-foreground/8 pt-3.5 text-[11px] text-muted-foreground">
            <span className="truncate font-medium text-foreground">
              {hoveredCell
                ? `${hoveredCell.label} · ${hoveredCell.day}: ${hoveredCell.count}`
                : "Hover any cell to inspect"}
            </span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <span className="h-3 w-3 rounded bg-surface" />
              <span className="h-3 w-3 rounded bg-accent" />
              <span className="h-3 w-3 rounded bg-primary/70" />
              <span className="h-3 w-3 rounded bg-primary" />
              <span>More</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
