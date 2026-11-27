import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Mail, MapPin, Phone, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/app/badges";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/consumers")({
  head: () => meta("Consumers", "View and manage registered consumer accounts."),
  component: AdminConsumers,
});

function AdminConsumers() {
  const { users, complaints, updateUser } = useStore();
  const [q, setQ] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive">("all");

  const consumers = users.filter((u) => u.role === "consumer");
  const activeCount = consumers.filter((u) => u.active).length;

  const rows = consumers.filter((u) => {
    if (statusTab === "active" && !u.active) return false;
    if (statusTab === "inactive" && u.active) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (u.name + u.email + (u.phone ?? "") + (u.area ?? "")).toLowerCase().includes(term);
  });

  const complaintCount = (id: string) => complaints.filter((c) => c.consumerId === id).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consumers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registered residents and businesses reporting electricity issues on Power-Track.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-card px-3.5 py-1.5 text-xs font-bold text-foreground">
            <Users className="h-3.5 w-3.5 text-primary" /> {consumers.length} Total
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background">
            <span className="h-2 w-2 rounded-full bg-success" /> {activeCount} Active
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-3xl border border-foreground/8 bg-card p-4 shadow-xs lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `All (${consumers.length})`],
              ["active", `Active (${activeCount})`],
              ["inactive", `Inactive (${consumers.length - activeCount})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusTab(key)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                statusTab === key
                  ? "bg-foreground text-background"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search consumer name, email…"
            className="h-10 w-full rounded-full border border-foreground/12 bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none"
          />
        </div>
      </div>

      {/* Consumers Table */}
      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-foreground/15 bg-card p-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <Users className="h-5 w-5" />
          </span>
          <p className="mt-4 text-base font-bold text-foreground">No consumers found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Consumer accounts will appear here as residents sign up.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-foreground/8 bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-foreground/8 bg-surface hover:bg-surface">
                <TableHead className="whitespace-nowrap py-4 pl-6 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Consumer
                </TableHead>
                <TableHead className="hidden whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground md:table-cell">
                  Contact
                </TableHead>
                <TableHead className="hidden whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:table-cell">
                  Area
                </TableHead>
                <TableHead className="whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Reports
                </TableHead>
                <TableHead className="whitespace-nowrap py-4 pr-6 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Account
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-foreground/6">
              {rows.map((u) => {
                const reports = complaintCount(u.id);

                return (
                  <TableRow key={u.id} className="transition-colors hover:bg-surface/60">
                    <TableCell className="whitespace-nowrap py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={u.name}
                          avatarUrl={u.avatarUrl}
                          className="h-10 w-10 rounded-2xl bg-surface text-xs text-foreground"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground md:hidden">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap py-4 text-xs text-muted-foreground md:table-cell">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {u.email}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {u.phone || "—"}
                      </span>
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap py-4 text-xs sm:table-cell">
                      {u.area ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 font-medium text-foreground">
                          <MapPin className="h-3 w-3 text-primary" /> {u.area}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 font-mono text-xs font-bold text-foreground">
                        <ClipboardList className="h-3.5 w-3.5 text-primary" /> {reports}
                      </span>
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-4 pr-6 text-right">
                      <div className="inline-flex items-center gap-2.5">
                        <span className="hidden text-xs font-semibold text-foreground sm:inline">
                          {u.active ? "Active" : "Disabled"}
                        </span>
                        <Switch
                          checked={u.active}
                          onCheckedChange={(v) => {
                            void updateUser(u.id, { active: v });
                            toast.success(`${u.name} ${v ? "activated" : "deactivated"}`);
                          }}
                        />
                      </div>
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

