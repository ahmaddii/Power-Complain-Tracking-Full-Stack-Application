import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HardHat, Mail, MapPin, Phone, Search, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/app/badges";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export const Route = createFileRoute("/admin/users")({
  head: () => meta("Users & Workers", "Manage consumers, administrators and field workers."),
  component: UsersPage,
});

const LABEL: Record<Role, string> = { consumer: "Consumer", admin: "Administrator", worker: "Field Worker" };

function UsersPage() {
  const { users, complaints, updateUser, currentUser } = useStore();
  const [tab, setTab] = useState<"all" | Role>("all");
  const [q, setQ] = useState("");

  const workersCount = users.filter((u) => u.role === "worker").length;
  const consumersCount = users.filter((u) => u.role === "consumer").length;
  const adminsCount = users.filter((u) => u.role === "admin").length;

  const rows = users.filter(
    (u) =>
      (tab === "all" || u.role === tab) &&
      (u.name + u.email + (u.area ?? "")).toLowerCase().includes(q.trim().toLowerCase()),
  );

  const openLoad = (id: string) => complaints.filter((c) => c.workerId === id && c.status !== "Resolved").length;

  const avatarStyle = (r: Role) => {
    if (r === "admin") return "bg-foreground text-background";
    if (r === "worker") return "bg-primary text-primary-foreground";
    return "bg-surface text-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Header + Role Summary Pills */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users &amp; Field Workers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage registered accounts, promote users to field workers or admins, and monitor active workload.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-card px-3.5 py-1.5 text-xs font-bold text-foreground">
            <UsersIcon className="h-3.5 w-3.5 text-primary" /> {users.length} Total
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-accent px-3.5 py-1.5 text-xs font-bold text-primary">
            <HardHat className="h-3.5 w-3.5" /> {workersCount} Workers
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> {adminsCount} Admins
          </span>
        </div>
      </div>

      {/* Unified Filter & Search Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-3xl border border-foreground/8 bg-card p-4 shadow-xs lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `All (${users.length})`],
              ["worker", `Field Workers (${workersCount})`],
              ["consumer", `Consumers (${consumersCount})`],
              ["admin", `Admins (${adminsCount})`],
            ] as const
          ).map(([key, text]) => (
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
              {text}
            </button>
          ))}
        </div>

        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, zone…"
            className="h-10 w-full rounded-full border border-foreground/12 bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none"
          />
        </div>
      </div>

      {/* Users Table Card */}
      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-foreground/15 bg-card p-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <UsersIcon className="h-5 w-5" />
          </span>
          <p className="mt-4 text-base font-bold text-foreground">No users found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Registered accounts will appear here once people sign up.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-foreground/8 bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-foreground/8 bg-surface hover:bg-surface">
                <TableHead className="py-4 pl-6 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  User
                </TableHead>
                <TableHead className="hidden py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground md:table-cell">
                  Contact
                </TableHead>
                <TableHead className="py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Role
                </TableHead>
                <TableHead className="hidden py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:table-cell">
                  Zone
                </TableHead>
                <TableHead className="hidden py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:table-cell">
                  Open Tasks
                </TableHead>
                <TableHead className="py-4 pr-6 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-foreground/6">
              {rows.map((u) => {
                const tasks = openLoad(u.id);
                const isSelf = u.id === currentUser?.id;

                return (
                  <TableRow key={u.id} className="transition-colors hover:bg-surface/60">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={u.name}
                          avatarUrl={u.avatarUrl}
                          className={cn("h-10 w-10 rounded-2xl text-xs", avatarStyle(u.role))}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
                            {isSelf && (
                              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                You
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground md:hidden">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden py-4 text-xs text-muted-foreground md:table-cell">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {u.email}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {u.phone || "—"}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      <Select
                        value={u.role}
                        disabled={isSelf}
                        onValueChange={(v) => {
                          void updateUser(u.id, { role: v as Role });
                          toast.success(`${u.name} is now ${LABEL[v as Role]}`);
                        }}
                      >
                        <SelectTrigger className="h-9 w-40 rounded-full border-foreground/12 bg-background px-3.5 text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {(Object.keys(LABEL) as Role[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="hidden py-4 text-xs sm:table-cell">
                      {u.area ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 font-medium text-foreground">
                          <MapPin className="h-3 w-3 text-primary" /> {u.area}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="hidden py-4 text-xs sm:table-cell">
                      {u.role === "worker" ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold",
                            tasks > 0 ? "bg-accent text-primary" : "bg-surface text-muted-foreground",
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", tasks > 0 ? "bg-primary" : "bg-foreground/30")} />
                          {tasks} open
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4 pr-6 text-right">
                      <div className="inline-flex items-center gap-2.5">
                        <span
                          className={cn(
                            "hidden text-xs font-semibold sm:inline",
                            u.active ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {u.active ? "Active" : "Inactive"}
                        </span>
                        <Switch
                          checked={u.active}
                          disabled={isSelf}
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
