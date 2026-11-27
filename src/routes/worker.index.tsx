import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Navigation,
  Phone,
  Play,
  Siren,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge, StatusBadge, UserAvatar } from "@/components/app/badges";
import { TaskCard } from "@/components/app/TaskCard";
import { ActivityTimeline } from "@/components/app/ActivityTimeline";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/worker/")({
  head: () => meta("Field Worker Dashboard", "Your assigned electricity repair tasks at a glance."),
  component: WorkerDashboard,
});

const RANK = { Emergency: 0, High: 1, Normal: 2 };

function WorkerDashboard() {
  const { complaints, currentUser, userById, setStatus } = useStore();

  const mine = useMemo(
    () => complaints.filter((c) => c.workerId === currentUser?.id),
    [complaints, currentUser?.id],
  );
  const open = useMemo(
    () => mine.filter((c) => c.status !== "Resolved").sort((a, b) => RANK[a.priority] - RANK[b.priority]),
    [mine],
  );
  const inProgress = open.filter((c) => c.status === "In Progress").length;
  const emergency = open.filter((c) => c.priority === "Emergency").length;
  const completed = mine.length - open.length;
  const completionRate = mine.length > 0 ? Math.round((completed / mine.length) * 100) : 0;

  const topJob = open[0] ?? null;
  const topConsumer = topJob ? userById(topJob.consumerId) : null;

  const donePct = mine.length > 0 ? (completed / mine.length) * 100 : 0;
  const progPct = mine.length > 0 ? (inProgress / mine.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Executive Shift Overview Card */}
      <section className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                <Wrench className="h-3 w-3" /> Field Crew Shift
              </span>
              {currentUser?.area && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-foreground">
                  <MapPin className="h-3 w-3 text-primary" /> {currentUser.area}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Good day, {currentUser?.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {open.length > 0
                ? `You have ${open.length} active ${open.length === 1 ? "task" : "tasks"} prioritized by urgency.`
                : "All assigned repairs are completed. Great work."}
            </p>
          </div>

          <div className="lg:w-80">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Completion Rate
              </span>
              <span className="text-3xl font-extrabold tracking-tight text-foreground">{completionRate}%</span>
            </div>
            <div className="mt-2.5 flex h-3 w-full overflow-hidden rounded-full bg-surface">
              {donePct > 0 && <div className="h-full bg-foreground" style={{ width: `${donePct}%` }} />}
              {progPct > 0 && <div className="h-full bg-primary" style={{ width: `${progPct}%` }} />}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{completed} completed</span>
              <span>{inProgress} in progress</span>
            </div>
          </div>
        </div>

        {/* 4 Clean KPI Tiles */}
        <div className="mt-7 grid gap-3 border-t border-foreground/8 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Assigned", value: mine.length, icon: ClipboardList, style: "bg-surface text-foreground" },
            { label: "Open Tasks", value: open.length, icon: Wrench, style: "bg-accent text-primary" },
            { label: "Emergencies", value: emergency, icon: Siren, style: "bg-destructive text-destructive-foreground" },
            { label: "Completed", value: completed, icon: CheckCircle2, style: "bg-foreground text-background" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between rounded-2xl border border-foreground/8 bg-background px-4 py-4"
            >
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.style}`}>
                <stat.icon className="h-4 w-4" />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Next Priority Job Spotlight (Solid Ink-Black Card) */}
      {topJob && (
        <section className="rounded-3xl bg-foreground p-6 text-background shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
                  Next Priority Dispatch
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-bold text-background">
                  {topJob.id}
                </span>
                <PriorityBadge priority={topJob.priority} />
                <StatusBadge status={topJob.status} />
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-background">{topJob.title}</h2>
              <p className="mt-1.5 max-w-2xl text-sm text-background/70">{topJob.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-background/80">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {topJob.address}
                </span>
                {topConsumer && (
                  <span className="inline-flex items-center gap-2">
                    <UserAvatar
                      name={topConsumer.name}
                      avatarUrl={topConsumer.avatarUrl}
                      className="h-5 w-5 rounded-full bg-white/15 text-[9px] text-background"
                    />
                    {topConsumer.name}
                    {topConsumer.phone && (
                      <span className="inline-flex items-center gap-1 text-background/65">
                        · <Phone className="h-3 w-3" /> {topConsumer.phone}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              {topJob.status === "Assigned" && (
                <button
                  type="button"
                  onClick={() => {
                    setStatus(topJob.id, "In Progress", "Work started on site");
                    toast.success(`Started work on ${topJob.id}`);
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Start Work
                </button>
              )}

              {topJob.latitude !== undefined && topJob.longitude !== undefined && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${topJob.latitude},${topJob.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-xs font-bold uppercase tracking-[0.12em] text-background transition-colors hover:bg-white/10"
                >
                  <Navigation className="h-3.5 w-3.5 text-primary" /> Maps
                </a>
              )}

              <Link
                to="/complaints/$id"
                params={{ id: topJob.id }}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-6 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <span>Open Job</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Priority Queue + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Priority Queue</h2>
            <Link to="/worker/tasks" className="text-xs font-semibold text-primary hover:underline">
              View all tasks →
            </Link>
          </div>

          {open.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {open.slice(0, 4).map((c) => (
                <TaskCard key={c.id} c={c} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-foreground/15 bg-card p-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <p className="mt-4 text-base font-bold text-foreground">No open tasks</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;re all caught up. New assignments from dispatch will appear here automatically.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs lg:col-span-4">
          <h2 className="mb-4 text-lg font-bold tracking-tight">Recent Activity</h2>
          <ActivityTimeline complaints={mine} />
        </section>
      </div>
    </div>
  );
}
