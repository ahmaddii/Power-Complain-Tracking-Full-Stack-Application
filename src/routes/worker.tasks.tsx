import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Search, Siren, Wrench } from "lucide-react";
import { TaskCard } from "@/components/app/TaskCard";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { PRIORITIES } from "@/utils/helpers";
import type { Priority } from "@/types";

export const Route = createFileRoute("/worker/tasks")({
  head: () => meta("My Tasks", "All complaints assigned to you, sorted by priority."),
  component: Tasks,
});

const RANK = { Emergency: 0, High: 1, Normal: 2 };

function Tasks() {
  const { complaints, currentUser } = useStore();
  const [tab, setTab] = useState<"open" | "done" | "all">("open");
  const [prioFilter, setPrioFilter] = useState<"all" | Priority>("all");
  const [q, setQ] = useState("");

  const assigned = useMemo(
    () => complaints.filter((c) => c.workerId === currentUser?.id),
    [complaints, currentUser?.id],
  );

  const openCount = assigned.filter((c) => c.status !== "Resolved").length;
  const doneCount = assigned.length - openCount;
  const emergencyCount = assigned.filter((c) => c.status !== "Resolved" && c.priority === "Emergency").length;

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return assigned
      .filter((c) => {
        if (tab === "open" && c.status === "Resolved") return false;
        if (tab === "done" && c.status !== "Resolved") return false;
        if (prioFilter !== "all" && c.priority !== prioFilter) return false;
        if (!term) return true;
        return (
          c.id.toLowerCase().includes(term) ||
          c.title.toLowerCase().includes(term) ||
          c.address.toLowerCase().includes(term) ||
          c.category.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => RANK[a.priority] - RANK[b.priority]);
  }, [assigned, tab, prioFilter, q]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open any job to update progress, log on-site notes, and upload before &amp; after photos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-card px-3.5 py-1.5 text-xs font-bold text-foreground">
            <Wrench className="h-3.5 w-3.5 text-primary" /> {openCount} Open
          </span>
          {emergencyCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/25 bg-card px-3.5 py-1.5 text-xs font-bold text-destructive">
              <Siren className="h-3.5 w-3.5" /> {emergencyCount} Emergency
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {doneCount} Completed
          </span>
        </div>
      </div>

      {/* Unified Filter & Search Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-3xl border border-foreground/8 bg-card p-4 shadow-xs lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["open", `Open (${openCount})`],
              ["done", `Completed (${doneCount})`],
              ["all", `All (${assigned.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                tab === key
                  ? "bg-foreground text-background"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}

          <span className="mx-1 hidden h-5 w-px bg-foreground/10 sm:inline-block" />

          <button
            type="button"
            onClick={() => setPrioFilter("all")}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              prioFilter === "all" ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Any priority
          </button>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrioFilter(p)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                prioFilter === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="relative lg:w-64">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ID, title, street…"
            className="h-10 w-full rounded-full border border-foreground/12 bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none"
          />
        </div>
      </div>

      {/* Tasks Grid */}
      {list.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => (
            <TaskCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-foreground/15 bg-card p-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <Wrench className="h-5 w-5" />
          </span>
          <p className="mt-4 text-base font-bold text-foreground">No tasks in this view</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch tabs or clear your search to see other assigned jobs.
          </p>
        </div>
      )}
    </div>
  );
}
