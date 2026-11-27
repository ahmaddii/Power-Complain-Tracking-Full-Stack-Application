import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  HardHat,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { PriorityBadge, StatusBadge, UserAvatar } from "@/components/app/badges";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/helpers";
import type { Complaint } from "@/types";

export const Route = createFileRoute("/consumer/")({
  head: () => meta("Consumer Dashboard", "Overview of your electricity complaints and recent activity."),
  component: ConsumerDashboard,
});

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function getCategoryTileStyle(c: Complaint) {
  if (c.priority === "Emergency") return "bg-primary text-primary-foreground";
  if (c.status === "Resolved") return "bg-foreground text-background";
  return "bg-surface text-foreground";
}

function TickMeter({ ratio, activeColor }: { ratio: number; activeColor: string }) {
  const totalTicks = 14;
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * totalTicks);
  return (
    <div className="mt-4 flex items-end gap-1" aria-hidden="true">
      {Array.from({ length: totalTicks }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-7 flex-1 rounded-full transition-colors",
            i < filled ? activeColor : "bg-foreground/10",
          )}
        />
      ))}
    </div>
  );
}

function ConsumerDashboard() {
  const { complaints, currentUser, userById } = useStore();
  const [range, setRange] = useState<"week" | "all">("week");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const mine = useMemo(
    () => complaints.filter((c) => c.consumerId === currentUser?.id),
    [complaints, currentUser?.id],
  );

  const pending = mine.filter(
    (c) => c.status === "Submitted" || c.status === "Under Review" || c.status === "Assigned",
  ).length;
  const inProg = mine.filter((c) => c.status === "In Progress").length;
  const resolved = mine.filter((c) => c.status === "Resolved").length;
  const total = mine.length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Build 7-day activity lollipop chart data (Sunday..Saturday or last 7 days)
  const chartData = useMemo(() => {
    const today = new Date();
    const counts = Array(7).fill(0) as number[];
    const cutoff = Date.now() - 7 * 86400000;

    for (const c of mine) {
      const ts = new Date(c.createdAt).getTime();
      if (range === "week" && ts < cutoff) continue;
      const dayIdx = new Date(c.createdAt).getDay();
      counts[dayIdx] += 1;
    }

    const max = Math.max(1, ...counts);
    const todayIdx = today.getDay();
    const peakIdx = counts.some((v) => v > 0) ? counts.indexOf(Math.max(...counts)) : todayIdx;

    return { counts, max, peakIdx, todayIdx };
  }, [mine, range]);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const activeDay = selectedDay ?? chartData.peakIdx;

  // Determine expanded recent complaint (default to first item)
  const recent = mine.slice(0, 4);
  const activeExpanded = expandedId ?? recent[0]?.id ?? null;

  // Unique assigned field workers on the consumer's complaints
  const assignedWorkers = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string; area?: string; avatarUrl?: string; phone: string; activeCount: number }[] = [];
    for (const c of mine) {
      if (!c.workerId || seen.has(c.workerId)) continue;
      const w = userById(c.workerId);
      if (!w) continue;
      seen.add(w.id);
      list.push({
        id: w.id,
        name: w.name,
        area: w.area,
        avatarUrl: w.avatarUrl,
        phone: w.phone,
        activeCount: mine.filter((x) => x.workerId === w.id && x.status !== "Resolved").length,
      });
    }
    return list;
  }, [mine, userById]);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Top Row: Activity Tracker (7 cols) + Recent Complaints Accordion (5 cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Big Hero Activity Card */}
        <section className="flex flex-col justify-between rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-8 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-foreground">
                  <Activity className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Complaint Tracker</h1>
              </div>
              <p className="mt-2.5 max-w-md text-sm text-muted-foreground">
                Welcome back, {currentUser?.name.split(" ")[0]}. Track your reported electricity issues and resolution
                pace at a glance.
              </p>
            </div>

            <div className="inline-flex rounded-full border border-foreground/12 bg-surface p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setRange("week");
                  setSelectedDay(null);
                }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 transition-colors",
                  range === "week" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => {
                  setRange("all");
                  setSelectedDay(null);
                }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 transition-colors",
                  range === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Interactive Lollipop Bar Visualization + Bottom-Left Big KPI */}
          <div className="mt-8 grid items-end gap-8 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <p className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                {total > 0 ? `${resolutionRate}%` : "0"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {total > 0
                  ? `${resolved} of ${total} reported ${total === 1 ? "issue" : "issues"} resolved`
                  : "No complaints reported yet. Submit your first issue anytime."}
              </p>
            </div>

            <div className="sm:col-span-8">
              <div className="grid grid-cols-7 items-end gap-2 pt-8">
                {DAY_LETTERS.map((letter, idx) => {
                  const count = chartData.counts[idx];
                  const isActive = idx === activeDay;
                  const heightPx = count > 0 ? Math.round(32 + (count / chartData.max) * 86) : 22;

                  return (
                    <button
                      key={`${letter}-${idx}`}
                      type="button"
                      onClick={() => setSelectedDay(idx)}
                      className={cn(
                        "group relative flex flex-col items-center rounded-2xl py-2 transition-colors",
                        isActive ? "bg-surface" : "hover:bg-surface/60",
                      )}
                    >
                      {/* Floating Ink-Black Pill Tooltip on Active Day */}
                      {isActive && (
                        <span className="absolute -top-7 whitespace-nowrap rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold text-background">
                          {count} {count === 1 ? "issue" : "issues"}
                        </span>
                      )}

                      {/* Stem + Dot */}
                      <div className="flex h-[126px] flex-col items-center justify-end">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full transition-colors",
                            isActive
                              ? "bg-primary"
                              : count > 0
                                ? "bg-foreground/50 group-hover:bg-primary"
                                : "bg-foreground/20",
                          )}
                        />
                        <span
                          className={cn(
                            "mt-1 w-0.5 rounded-full transition-all",
                            isActive ? "bg-foreground/40" : "bg-foreground/15",
                          )}
                          style={{ height: `${heightPx}px` }}
                        />
                      </div>

                      {/* Day Circle Pill */}
                      <span
                        className={cn(
                          "mt-3 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                          isActive
                            ? "bg-foreground text-background"
                            : "bg-card text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        {letter}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Your Recent Complaints Accordion */}
        <section className="flex flex-col rounded-3xl border border-foreground/8 bg-background p-6 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Your Recent Complaints</h2>
            <Link
              to="/consumer/complaints"
              className="text-xs font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-primary"
            >
              See all
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/15 bg-card p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
                <Zap className="h-5 w-5" />
              </span>
              <p className="mt-4 font-semibold text-foreground">No complaints yet</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Report a power outage, damaged meter, or fallen pole and track every step here.
              </p>
              <Link
                to="/consumer/submit"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-6 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Submit Complaint
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((c) => {
                const isOpen = activeExpanded === c.id;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-2xl border bg-card p-4 transition-colors",
                      isOpen ? "border-foreground/15 shadow-xs" : "border-foreground/8 hover:border-foreground/15",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            getCategoryTileStyle(c),
                          )}
                        >
                          <Zap className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">{c.title}</p>
                            <StatusBadge status={c.status} />
                          </div>
                          <p className="font-mono text-xs text-muted-foreground">{c.id}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? "" : c.id)}
                        aria-label={isOpen ? "Collapse details" : "Expand details"}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-foreground transition-colors hover:bg-foreground hover:text-background"
                      >
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mt-4 border-t border-border/70 pt-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                            {c.category}
                          </span>
                          <PriorityBadge priority={c.priority} />
                        </div>
                        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {c.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{c.address}</span>
                          </span>
                          <Link
                            to="/complaints/$id"
                            params={{ id: c.id }}
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            View details <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Row: 3 Big Bento Cards */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Card 1: Assigned Technicians / Support Contacts */}
        <section className="rounded-3xl border border-foreground/8 bg-background p-6 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Assigned Crews</h2>
            <Link
              to="/consumer/complaints"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </div>

          {assignedWorkers.length > 0 ? (
            <div className="space-y-3">
              {assignedWorkers.slice(0, 2).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-foreground/8 bg-card p-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={w.name}
                      avatarUrl={w.avatarUrl}
                      className="h-11 w-11 rounded-full bg-foreground text-xs text-background"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{w.name}</p>
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          Field Crew
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {w.area ? `Zone: ${w.area}` : w.phone || "Dispatched technician"}
                      </p>
                    </div>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-foreground">
                    <Phone className="h-3.5 w-3.5" />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                {
                  icon: HardHat,
                  title: "Field Dispatch Team",
                  badge: "24/7",
                  sub: "Assigned automatically after admin review",
                },
                {
                  icon: ShieldCheck,
                  title: "Emergency Safety Desk",
                  badge: "Priority",
                  sub: "Live wires & fallen poles escalated first",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-foreground/8 bg-card p-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-foreground">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary">
                          {item.badge}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Card 2: Solid Ink-Black Quick Report Action Card */}
        <section className="flex flex-col justify-between rounded-3xl bg-foreground p-7 text-background shadow-sm lg:col-span-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
              <Clock className="h-3 w-3" /> Under 60 Seconds
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Report a New Power Issue</h2>
            <p className="mt-2 text-xs leading-relaxed text-background/70">
              Attach photos of damaged meters, broken wires, or outages and get notified at every repair milestone.
            </p>
          </div>

          <Link
            to="/consumer/submit"
            className="group mt-6 flex h-12 w-full items-center justify-between rounded-full bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <span>Submit Complaint</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </section>

        {/* Card 3: Resolution Progress Tick-Bar Card */}
        <section className="flex flex-col justify-between rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold tracking-tight">Complaint Progress</h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> {todayLabel}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x divide-border">
            <div className="pr-3">
              <p className="text-xs font-medium text-muted-foreground">Pending</p>
              <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-foreground">{pending}</p>
              <TickMeter ratio={total > 0 ? pending / total : 0} activeColor="bg-foreground/45" />
            </div>

            <div className="px-3">
              <p className="text-xs font-medium text-muted-foreground">In Progress</p>
              <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-foreground">{inProg}</p>
              <TickMeter ratio={total > 0 ? inProg / total : 0} activeColor="bg-primary" />
            </div>

            <div className="pl-3">
              <p className="text-xs font-medium text-muted-foreground">Resolved</p>
              <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-foreground">{resolved}</p>
              <TickMeter ratio={total > 0 ? resolved / total : 0} activeColor="bg-foreground" />
            </div>
          </div>

          {mine[0] && (
            <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-3.5 text-xs text-muted-foreground">
              <span className="truncate">Latest update: {formatDateTime(mine[0].updatedAt)}</span>
              <Link to="/complaints/$id" params={{ id: mine[0].id }} className="shrink-0 font-semibold text-primary hover:underline">
                Track →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
