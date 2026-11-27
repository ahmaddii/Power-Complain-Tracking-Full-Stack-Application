import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Clock, HardHat, Percent, Timer } from "lucide-react";
import { ComplaintsHeatmap } from "@/components/app/ComplaintsHeatmap";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { CATEGORIES, PRIORITIES } from "@/utils/helpers";

export const Route = createFileRoute("/admin/analytics")({
  head: () => meta("Analytics", "Complaint statistics by category, priority, trend and worker."),
  component: Analytics,
});

const TOOLTIP_STYLE = {
  backgroundColor: "var(--foreground)",
  color: "var(--background)",
  border: "none",
  borderRadius: "14px",
  padding: "10px 14px",
  fontSize: "12px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
};

const PRIO_COLORS = ["var(--destructive)", "var(--primary)", "var(--foreground)"];

function ChartCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {badge}
      </div>
      <div className="h-72">{children}</div>
    </section>
  );
}

function Analytics() {
  const { complaints, users } = useStore();
  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === "Resolved");
  const openCount = total - resolved.length;
  const resolutionRate = total > 0 ? Math.round((resolved.length / total) * 100) : 0;

  const avgH = resolved.length
    ? Math.round(
        resolved.reduce(
          (s, c) => s + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()),
          0,
        ) /
          resolved.length /
          3600000,
      )
    : 0;

  const activeWorkers = users.filter((u) => u.role === "worker" && u.active).length;

  const byCat = CATEGORIES.map((c) => ({
    name: c.replace(" Issue", ""),
    count: complaints.filter((x) => x.category === c).length,
  })).sort((a, b) => b.count - a.count);

  const byPrio = PRIORITIES.map((p, idx) => ({
    name: p,
    value: complaints.filter((x) => x.priority === p).length,
    color: PRIO_COLORS[idx],
  }));

  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = Date.now() - (5 - i) * 7 * 86400000;
    const start = end - 7 * 86400000;
    const inRange = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= start && t < end;
    };
    const labelDate = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return {
      name: labelDate,
      submitted: complaints.filter((c) => inRange(c.createdAt)).length,
      resolved: resolved.filter((c) => inRange(c.updatedAt)).length,
    };
  });

  const workers = users
    .filter((u) => u.role === "worker")
    .map((w) => ({
      name: w.name.split(" ")[0],
      open: complaints.filter((c) => c.workerId === w.id && c.status !== "Resolved").length,
      resolved: resolved.filter((c) => c.workerId === w.id).length,
    }));

  const axisProps = {
    tick: { fontSize: 11, fill: "var(--muted-foreground)" },
    axisLine: false,
    tickLine: false,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Network Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live performance metrics across resolution speed, fault categories, and field crew workload.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-foreground/10 bg-card px-4 py-1.5 text-xs font-semibold text-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {total} Total Records
        </span>
      </div>

      {/* 4 Solid Executive KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Resolution Rate
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
              <Percent className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-4xl font-extrabold tracking-tight text-foreground">{resolutionRate}%</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, resolutionRate)}%` }} />
          </div>
        </div>

        <div className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Avg. Turnaround
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-foreground">
              <Timer className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-4xl font-extrabold tracking-tight text-foreground">{avgH}h</p>
          <p className="mt-2 text-xs text-muted-foreground">Average time from report to resolved</p>
        </div>

        <div className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Open Complaints
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-4xl font-extrabold tracking-tight text-foreground">{openCount}</p>
          <p className="mt-2 text-xs text-muted-foreground">{resolved.length} completed to date</p>
        </div>

        <div className="rounded-3xl bg-foreground p-6 text-background shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-background/65">
              Active Crews
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HardHat className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-4xl font-extrabold tracking-tight text-background">{activeWorkers}</p>
          <p className="mt-2 text-xs text-background/65">Field technicians ready for dispatch</p>
        </div>
      </div>

      {/* Live Geographic Mapbox Heatmap */}
      <ComplaintsHeatmap complaints={complaints} />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Weekly Velocity Line Chart (7 cols) */}
        <div className="lg:col-span-7">
          <ChartCard
            title="Weekly Resolution Velocity"
            subtitle="Submitted vs resolved complaints over the last 6 weeks"
            badge={
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Submitted
                </span>
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground" /> Resolved
                </span>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeks} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "var(--background)" }} />
                <Line
                  type="monotone"
                  dataKey="submitted"
                  name="Submitted"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--primary)" }}
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  name="Resolved"
                  stroke="var(--foreground)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--foreground)", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--foreground)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Priority Donut Chart (5 cols) */}
        <div className="lg:col-span-5">
          <section className="flex h-full flex-col justify-between rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-7">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Priority Distribution</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Urgency breakdown across all reports</p>
            </div>

            <div className="relative mx-auto my-4 h-48 w-full max-w-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byPrio}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={82}
                    paddingAngle={4}
                    cornerRadius={8}
                    stroke="none"
                  >
                    {byPrio.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "var(--background)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">{total}</span>
                <span className="text-[11px] font-medium text-muted-foreground">Total</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {byPrio.map((item) => {
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div
                    key={item.name}
                    className="rounded-2xl border border-foreground/8 bg-background px-3 py-2.5 text-center"
                  >
                    <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <p className="mt-1 font-mono text-sm font-extrabold text-foreground">
                      {item.value}{" "}
                      <span className="text-[11px] font-medium text-muted-foreground">({pct}%)</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Complaints by Category — Ranked Visual Bar Breakdown (6 cols) */}
        <div className="lg:col-span-6">
          <section className="flex h-full flex-col justify-between rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Complaints by Category</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Ranked share of electrical faults reported</p>
              </div>
              <span className="rounded-full bg-surface px-3 py-1 font-mono text-[11px] font-bold text-foreground">
                Top {byCat.length}
              </span>
            </div>

            <div className="space-y-3.5">
              {byCat.map((item, idx) => {
                const maxVal = Math.max(1, byCat[0]?.count ?? 1);
                const barPct = item.count > 0 ? Math.max(8, Math.round((item.count / maxVal) * 100)) : 0;
                const sharePct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                const isTop = idx === 0 && item.count > 0;

                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={
                            isTop
                              ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-[10px] font-bold text-primary-foreground"
                              : "flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface font-mono text-[10px] font-bold text-muted-foreground"
                          }
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate font-semibold text-foreground">{item.name}</span>
                      </div>
                      <span className="shrink-0 whitespace-nowrap font-mono text-xs font-bold text-foreground">
                        {item.count}{" "}
                        <span className="font-normal text-muted-foreground">({sharePct}%)</span>
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface">
                      {barPct > 0 && (
                        <div
                          className={isTop ? "h-full rounded-full bg-primary" : "h-full rounded-full bg-foreground"}
                          style={{ width: `${barPct}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Field Crew Workload Grouped Bar Chart (6 cols) */}
        <div className="lg:col-span-6">
          <ChartCard
            title="Field Crew Workload"
            subtitle="Open vs resolved tasks per technician"
            badge={
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Open
                </span>
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground" /> Resolved
                </span>
              </div>
            }
          >
            {workers.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/15 bg-background p-6 text-center">
                <HardHat className="h-7 w-7 text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">No field workers yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Promote a user to Field Worker in Users &amp; Workers to track workload here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workers} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip
                    cursor={{ fill: "var(--surface)" }}
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: "var(--background)" }}
                  />
                  <Bar dataKey="open" name="Open" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={22} />
                  <Bar dataKey="resolved" name="Resolved" fill="var(--foreground)" radius={[8, 8, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
