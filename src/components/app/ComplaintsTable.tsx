import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpDown, Search, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Complaint } from "@/types";
import { CATEGORIES, PRIORITIES, STATUSES, formatDate } from "@/utils/helpers";
import { PriorityBadge, StatusBadge, UserAvatar } from "./badges";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";

type SortKey = "createdAt" | "priority" | "status";
const PRANK = { Emergency: 0, High: 1, Normal: 2 };

export function ComplaintsTable({
  complaints,
  showFilters = true,
  showConsumer = false,
  showWorker = false,
  pageSize = 8,
}: {
  complaints: Complaint[];
  showFilters?: boolean;
  showConsumer?: boolean;
  showWorker?: boolean;
  pageSize?: number;
}) {
  const { userById } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("all");
  const [prio, setPrio] = useState("all");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    const r = complaints.filter(
      (c) =>
        (!t ||
          c.id.toLowerCase().includes(t) ||
          c.title.toLowerCase().includes(t) ||
          c.address.toLowerCase().includes(t)) &&
        (status === "all" || c.status === status) &&
        (cat === "all" || c.category === cat) &&
        (prio === "all" || c.priority === prio),
    );
    r.sort((a, b) => {
      let d = 0;
      if (sort === "createdAt") d = a.createdAt.localeCompare(b.createdAt);
      if (sort === "priority") d = PRANK[a.priority] - PRANK[b.priority];
      if (sort === "status") d = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
      return asc ? d : -d;
    });
    return r;
  }, [complaints, q, status, cat, prio, sort, asc]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const p = Math.min(page, pages - 1);
  const visible = rows.slice(p * pageSize, p * pageSize + pageSize);
  const toggle = (k: SortKey) => (sort === k ? setAsc(!asc) : (setSort(k), setAsc(false)));
  const SortH = ({ k, children }: { k: SortKey; children: string }) => (
    <button
      type="button"
      onClick={() => toggle(k)}
      className="inline-flex items-center gap-1 uppercase tracking-[0.1em] hover:text-foreground"
    >
      {children} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="grid gap-2.5 rounded-3xl border border-foreground/8 bg-card p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search ID, title, address…"
              className="h-10 w-full rounded-full border border-foreground/12 bg-background pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </div>
          {[
            [status, setStatus, STATUSES, "All statuses"],
            [cat, setCat, CATEGORIES, "All categories"],
            [prio, setPrio, PRIORITIES, "All priorities"],
          ].map(([v, set, opts, label]) => (
            <Select
              key={label as string}
              value={v as string}
              onValueChange={(x) => {
                (set as (s: string) => void)(x);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-full border-foreground/12 bg-background px-4 text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">{label as string}</SelectItem>
                {(opts as string[]).map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-foreground/15 bg-card p-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <Zap className="h-5 w-5" />
          </span>
          <p className="mt-4 text-base font-bold text-foreground">No complaints found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-foreground/8 bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-foreground/8 bg-surface hover:bg-surface">
                <TableHead className="whitespace-nowrap py-4 pl-6 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  ID
                </TableHead>
                <TableHead className="whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Complaint
                </TableHead>
                <TableHead className="hidden whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground md:table-cell">
                  Category
                </TableHead>
                {showConsumer && (
                  <TableHead className="hidden whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground lg:table-cell">
                    Consumer
                  </TableHead>
                )}
                {showWorker && (
                  <TableHead className="hidden whitespace-nowrap py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground lg:table-cell">
                    Field Crew
                  </TableHead>
                )}
                <TableHead className="whitespace-nowrap py-4 text-[11px] font-bold text-muted-foreground">
                  <SortH k="priority">Priority</SortH>
                </TableHead>
                <TableHead className="whitespace-nowrap py-4 text-[11px] font-bold text-muted-foreground">
                  <SortH k="status">Status</SortH>
                </TableHead>
                <TableHead className="hidden whitespace-nowrap py-4 text-[11px] font-bold text-muted-foreground sm:table-cell">
                  <SortH k="createdAt">Date</SortH>
                </TableHead>
                <TableHead className="whitespace-nowrap py-4 pr-6 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-foreground/6">
              {visible.map((c) => {
                const consumer = userById(c.consumerId);
                const worker = userById(c.workerId);
                return (
                  <TableRow key={c.id} className="group transition-colors hover:bg-surface/60">
                    <TableCell className="whitespace-nowrap py-4 pl-6">
                      <Link
                        to="/complaints/$id"
                        params={{ id: c.id }}
                        className="inline-flex whitespace-nowrap rounded-full bg-surface px-3 py-1 font-mono text-xs font-bold text-foreground transition-colors group-hover:bg-foreground group-hover:text-background"
                      >
                        {c.id}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[240px] py-4">
                      <Link
                        to="/complaints/$id"
                        params={{ id: c.id }}
                        className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                      >
                        {c.title}
                      </Link>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{c.address}</span>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap py-4 md:table-cell">
                      <span className="inline-flex whitespace-nowrap rounded-full border border-foreground/10 px-3 py-1 text-xs font-medium text-foreground">
                        {c.category}
                      </span>
                    </TableCell>
                    {showConsumer && (
                      <TableCell className="hidden whitespace-nowrap py-4 text-sm font-medium text-foreground lg:table-cell">
                        {consumer ? (
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <UserAvatar
                              name={consumer.name}
                              avatarUrl={consumer.avatarUrl}
                              className="h-6 w-6 rounded-full bg-surface text-[10px] text-foreground"
                            />
                            {consumer.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    {showWorker && (
                      <TableCell className="hidden whitespace-nowrap py-4 text-sm lg:table-cell">
                        {worker ? (
                          <span className="inline-flex items-center gap-2 whitespace-nowrap font-medium text-foreground">
                            <UserAvatar
                              name={worker.name}
                              avatarUrl={worker.avatarUrl}
                              className="h-6 w-6 rounded-full bg-primary text-[10px] text-primary-foreground"
                            />
                            {worker.name}
                          </span>
                        ) : (
                          <span className="whitespace-nowrap text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap py-4">
                      <PriorityBadge priority={c.priority} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-4">
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap py-4 text-xs text-muted-foreground sm:table-cell">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-4 pr-6 text-right">
                      <Link
                        to="/complaints/$id"
                        params={{ id: c.id }}
                        className={cn(
                          "inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full border border-foreground/15 bg-background px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background",
                        )}
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {rows.length > pageSize && (
        <div className="flex items-center justify-between rounded-2xl border border-foreground/8 bg-card px-5 py-3 text-xs text-muted-foreground">
          <span>
            Showing {p * pageSize + 1}–{Math.min(rows.length, (p + 1) * pageSize)} of {rows.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={p === 0}
              onClick={() => setPage(p - 1)}
              className="rounded-full border border-foreground/15 px-4 py-1.5 font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={p >= pages - 1}
              onClick={() => setPage(p + 1)}
              className="rounded-full border border-foreground/15 px-4 py-1.5 font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
