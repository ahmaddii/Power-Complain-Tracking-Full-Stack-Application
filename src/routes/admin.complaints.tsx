import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  HardHat,
  LayoutGrid,
  List,
  MapPin,
  Search,
  Siren,
  UserX,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriorityBadge, StatusBadge, UserAvatar } from "@/components/app/badges";
import { ComplaintsTable } from "@/components/app/ComplaintsTable";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { CATEGORIES, PRIORITIES, STATUSES, formatDate } from "@/utils/helpers";
import type { Status } from "@/types";

export const Route = createFileRoute("/admin/complaints")({
  head: () => meta("All Complaints", "Search, filter, sort and manage every complaint."),
  component: AdminComplaints,
});

function MiniRing({ value, resolved }: { value: number; resolved: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 13;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-2">
      <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground/12" />
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (v / 100) * circ}
          className={resolved ? "text-foreground" : "text-primary"}
        />
      </svg>
      <span className="font-mono text-xs font-bold text-foreground">{v}%</span>
    </div>
  );
}

function AdminComplaints() {
  const { complaints, users, userById, assign } = useStore();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [catFilter, setCatFilter] = useState("all");
  const [prioFilter, setPrioFilter] = useState("all");
  const [page, setPage] = useState(0);

  const activeWorkers = useMemo(() => users.filter((u) => u.role === "worker" && u.active), [users]);

  const openCount = complaints.filter((c) => c.status !== "Resolved").length;
  const emergencyCount = complaints.filter((c) => c.status !== "Resolved" && c.priority === "Emergency").length;
  const unassignedCount = complaints.filter((c) => c.status !== "Resolved" && !c.workerId).length;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return complaints.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (catFilter !== "all" && c.category !== catFilter) return false;
      if (prioFilter !== "all" && c.priority !== prioFilter) return false;
      if (!term) return true;
      const consumer = userById(c.consumerId)?.name.toLowerCase() ?? "";
      return (
        c.id.toLowerCase().includes(term) ||
        c.title.toLowerCase().includes(term) ||
        c.address.toLowerCase().includes(term) ||
        c.category.toLowerCase().includes(term) ||
        consumer.includes(term)
      );
    });
  }, [complaints, q, statusFilter, catFilter, prioFilter, userById]);

  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <div className="space-y-6">
      {/* Executive Header + Live Pill Counters */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Complaints</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Triage incoming reports, assign field crews inline, or open any ticket for full history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-card px-3.5 py-1.5 text-xs font-bold text-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" /> {openCount} Open
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/25 bg-card px-3.5 py-1.5 text-xs font-bold text-destructive">
            <Siren className="h-3.5 w-3.5" /> {emergencyCount} Emergency
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-accent px-3.5 py-1.5 text-xs font-bold text-primary">
            <UserX className="h-3.5 w-3.5" /> {unassignedCount} Unassigned
          </span>
        </div>
      </div>

      {/* Unified Filter & View Switcher Card */}
      <div className="space-y-4 rounded-3xl border border-foreground/8 bg-card p-4 shadow-xs sm:p-5">
        {/* Status Pills + Card/Table Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setPage(0);
              }}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                statusFilter === "all"
                  ? "bg-foreground text-background"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              All ({complaints.length})
            </button>
            {STATUSES.map((s) => {
              const count = complaints.filter((c) => c.status === s).length;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(0);
                  }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
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

          <div className="inline-flex rounded-full border border-foreground/10 bg-surface p-1">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                view === "cards" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                view === "table" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
          </div>
        </div>

        {/* Search + Category + Priority Controls */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search by complaint ID, title, address, or resident…"
              className="h-10 w-full rounded-full border border-foreground/12 bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none"
            />
          </div>

          <Select
            value={catFilter}
            onValueChange={(v) => {
              setCatFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 rounded-full border-foreground/12 bg-background px-4 text-xs font-medium">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={prioFilter}
            onValueChange={(v) => {
              setPrioFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 rounded-full border-foreground/12 bg-background px-4 text-xs font-medium">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Area: Table View OR Rich Triage Cards */}
      {view === "table" ? (
        <ComplaintsTable complaints={filtered} showFilters={false} showConsumer showWorker pageSize={10} />
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-foreground/15 bg-card p-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <Zap className="h-5 w-5" />
          </span>
          <p className="mt-4 text-base font-bold text-foreground">No complaints match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try clearing search or switching the status tab.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map((c) => {
              const consumer = userById(c.consumerId);
              const worker = userById(c.workerId);
              const resolved = c.status === "Resolved";

              return (
                <article
                  key={c.id}
                  className="flex flex-col justify-between rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs transition-colors hover:border-foreground/20"
                >
                  <div>
                    {/* Top Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-surface px-3 py-1 font-mono text-xs font-bold text-foreground">
                          {c.id}
                        </span>
                        <span className="rounded-full border border-foreground/10 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {c.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={c.priority} />
                        <StatusBadge status={c.status} />
                      </div>
                    </div>

                    {/* Title & Description */}
                    <Link to="/complaints/$id" params={{ id: c.id }} className="group mt-4 block">
                      <h2 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary">
                        {c.title}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                    </Link>

                    {/* Consumer, Address & Date Metadata */}
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2 font-medium text-foreground">
                        <UserAvatar
                          name={consumer?.name ?? "Consumer"}
                          avatarUrl={consumer?.avatarUrl}
                          className="h-6 w-6 rounded-full bg-surface text-[10px] text-foreground"
                        />
                        {consumer?.name ?? "Consumer"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> <span className="max-w-[220px] truncate">{c.address}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> {formatDate(c.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Inline Triage Footer */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/8 pt-4">
                    <div className="flex items-center gap-3">
                      <MiniRing value={c.progress} resolved={resolved} />

                      {!resolved && activeWorkers.length > 0 ? (
                        <Select
                          value={c.workerId ?? ""}
                          onValueChange={(wid) => {
                            assign(c.id, wid);
                            toast.success("Field worker assigned");
                          }}
                        >
                          <SelectTrigger className="h-9 w-44 rounded-full border-foreground/12 bg-background px-3.5 text-xs font-semibold">
                            <SelectValue placeholder="Assign worker…" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {activeWorkers.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.name}
                                {w.area ? ` — ${w.area}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
                          {worker ? (
                            <>
                              <UserAvatar
                                name={worker.name}
                                avatarUrl={worker.avatarUrl}
                                className="h-5 w-5 rounded-full bg-primary text-[9px] text-primary-foreground"
                              />
                              <span className="text-foreground">{worker.name}</span>
                            </>
                          ) : (
                            <>
                              <HardHat className="h-3.5 w-3.5 text-foreground" /> Unassigned
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <Link
                      to="/complaints/$id"
                      params={{ id: c.id }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-xs font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      <span>Manage</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length > pageSize && (
            <div className="flex items-center justify-between rounded-2xl border border-foreground/8 bg-card px-5 py-3 text-xs text-muted-foreground">
              <span>
                Showing {currentPage * pageSize + 1}–{Math.min(filtered.length, (currentPage + 1) * pageSize)} of{" "}
                {filtered.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-full border border-foreground/15 px-4 py-1.5 font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= pages - 1}
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  className="rounded-full border border-foreground/15 px-4 py-1.5 font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
