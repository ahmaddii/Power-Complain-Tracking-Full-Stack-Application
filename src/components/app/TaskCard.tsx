import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, MapPin, Navigation, Phone, Play } from "lucide-react";
import { toast } from "sonner";
import type { Complaint } from "@/types";
import { PriorityBadge, StatusBadge, UserAvatar } from "./badges";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/helpers";

export function TaskCard({ c }: { c: Complaint }) {
  const { userById, setStatus } = useStore();
  const consumer = userById(c.consumerId);
  const resolved = c.status === "Resolved";

  return (
    <article className="flex flex-col justify-between rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs transition-colors hover:border-foreground/20">
      <div>
        {/* Top Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface px-3 py-1 font-mono text-xs font-bold text-foreground">
              {c.id}
            </span>
            <span className="rounded-full border border-foreground/10 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {c.category}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <PriorityBadge priority={c.priority} />
            <StatusBadge status={c.status} />
          </div>
        </div>

        {/* Title & Description */}
        <Link to="/complaints/$id" params={{ id: c.id }} className="group mt-4 block">
          <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary">{c.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
        </Link>

        {/* Resident & Location */}
        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
          {consumer && (
            <div className="flex flex-wrap items-center gap-3 text-foreground">
              <span className="inline-flex items-center gap-2 font-semibold">
                <UserAvatar
                  name={consumer.name}
                  avatarUrl={consumer.avatarUrl}
                  className="h-6 w-6 rounded-full bg-surface text-[10px] text-foreground"
                />
                {consumer.name}
              </span>
              {consumer.phone && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-3 w-3" /> {consumer.phone}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{c.address}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {formatDate(c.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress & Quick Actions */}
      <div className="mt-5 border-t border-foreground/8 pt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">Repair progress</span>
          <span className="font-mono font-bold text-foreground">{c.progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className={cn("h-full rounded-full", resolved ? "bg-foreground" : "bg-primary")}
            style={{ width: `${Math.max(4, c.progress)}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {c.status === "Assigned" && (
              <button
                type="button"
                onClick={() => {
                  setStatus(c.id, "In Progress", "Work started on site");
                  toast.success(`Started work on ${c.id}`);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Play className="h-3 w-3 fill-current" /> Start Work
              </button>
            )}
            {c.latitude !== undefined && c.longitude !== undefined && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-foreground/15 bg-background px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground"
              >
                <Navigation className="h-3.5 w-3.5 text-primary" /> Navigate
              </a>
            )}
          </div>

          <Link
            to="/complaints/$id"
            params={{ id: c.id }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-xs font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <span>{resolved ? "View Summary" : "Open Task"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
