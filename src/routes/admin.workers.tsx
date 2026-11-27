import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, CheckCircle2, Clock, HardHat, Mail, MapPin, Phone, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/app/badges";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/workers")({
  head: () => meta("Field Workers", "Approve field worker applications and monitor crew workload."),
  component: AdminWorkers,
});

function AdminWorkers() {
  const { users, complaints, updateUser } = useStore();
  const [q, setQ] = useState("");

  const allWorkers = users.filter((u) => u.role === "worker");
  const pendingWorkers = allWorkers.filter((u) => !u.active);
  const approvedWorkers = allWorkers.filter((u) => u.active);

  const visibleApproved = approvedWorkers.filter((u) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (u.name + u.email + (u.phone ?? "") + (u.area ?? "")).toLowerCase().includes(term);
  });

  const openLoad = (id: string) => complaints.filter((c) => c.workerId === id && c.status !== "Resolved").length;
  const resolvedLoad = (id: string) => complaints.filter((c) => c.workerId === id && c.status === "Resolved").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Field Workers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve incoming technician applications and monitor active dispatch workload by zone.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingWorkers.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground">
              <Clock className="h-3.5 w-3.5" /> {pendingWorkers.length} Pending Approval
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background">
            <HardHat className="h-3.5 w-3.5 text-primary" /> {approvedWorkers.length} Active Crews
          </span>
        </div>
      </div>

      {/* Pending Field Worker Applications Section */}
      {pendingWorkers.length > 0 && (
        <section className="rounded-3xl border border-primary/30 bg-accent p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Pending Field Worker Approvals ({pendingWorkers.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Review each technician before granting access to assigned complaints.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {pendingWorkers.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-foreground/10 bg-card p-4 shadow-xs sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={w.name}
                      avatarUrl={w.avatarUrl}
                      className="h-11 w-11 rounded-2xl bg-foreground text-xs text-background"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{w.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{w.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {w.phone && <span>{w.phone}</span>}
                        {w.area && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 font-semibold text-foreground">
                            <MapPin className="h-2.5 w-2.5 text-primary" /> {w.area}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void updateUser(w.id, { active: true });
                        toast.success(`${w.name} approved as Field Worker`);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void updateUser(w.id, { role: "consumer", active: true });
                        toast.success(`${w.name} moved to Consumer role`);
                      }}
                      title="Decline worker request and convert to Consumer"
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-foreground/15 bg-background px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                </div>
            ))}
          </div>
        </section>
      )}

      {/* Search Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-3xl border border-foreground/8 bg-card p-4 shadow-xs sm:flex-row sm:items-center">
        <p className="pl-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Approved Technicians ({visibleApproved.length})
        </p>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search worker name, zone…"
            className="h-10 w-full rounded-full border border-foreground/12 bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none"
          />
        </div>
      </div>

      {/* Approved Workers Table */}
      {visibleApproved.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-foreground/15 bg-card p-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <HardHat className="h-5 w-5" />
          </span>
          <p className="mt-4 text-base font-bold text-foreground">No active field workers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Workers can apply on the registration page — approve their request above to activate them.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-foreground/8 bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-foreground/8 bg-surface hover:bg-surface">
                <TableHead className="whitespace-nowrap py-4 pl-6 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Technician
                </TableHead>
                <TableHead className="hidden whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground md:table-cell">
                  Contact
                </TableHead>
                <TableHead className="hidden whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:table-cell">
                  Service Zone
                </TableHead>
                <TableHead className="whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Open Tasks
                </TableHead>
                <TableHead className="hidden whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:table-cell">
                  Resolved
                </TableHead>
                <TableHead className="whitespace-nowrap py-4 pr-6 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Active
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-foreground/6">
              {visibleApproved.map((w) => {
                const open = openLoad(w.id);
                const done = resolvedLoad(w.id);

                return (
                  <TableRow key={w.id} className="transition-colors hover:bg-surface/60">
                    <TableCell className="whitespace-nowrap py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={w.name}
                          avatarUrl={w.avatarUrl}
                          className="h-10 w-10 rounded-2xl bg-primary text-xs text-primary-foreground"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{w.name}</p>
                          <p className="truncate text-xs text-muted-foreground md:hidden">{w.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap py-4 text-xs text-muted-foreground md:table-cell">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {w.email}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {w.phone || "—"}
                      </span>
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap py-4 text-xs sm:table-cell">
                      {w.area ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 font-medium text-foreground">
                          <MapPin className="h-3 w-3 text-primary" /> {w.area}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned zone</span>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold",
                          open > 0 ? "bg-accent text-primary" : "bg-surface text-muted-foreground",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", open > 0 ? "bg-primary" : "bg-foreground/30")} />
                        {open} open
                      </span>
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap py-4 sm:table-cell">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {done}
                      </span>
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-4 pr-6 text-right">
                      <Switch
                        checked={w.active}
                        onCheckedChange={(v) => {
                          void updateUser(w.id, { active: v });
                          toast.success(`${w.name} ${v ? "activated" : "moved to pending / inactive"}`);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

