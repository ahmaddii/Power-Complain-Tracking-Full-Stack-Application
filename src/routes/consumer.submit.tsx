import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import lottie from "lottie-web";
import {
  AlertTriangle,
  ArrowRight,
  ImagePlus,
  Info,
  Loader2,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import successAnimation from "@/assets/Success.json";
import { PriorityBadge } from "@/components/app/badges";
import { MapboxLocationPicker } from "@/components/app/MapboxLocationPicker";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { uploadImages, validateImage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Category, Complaint } from "@/types";
import { CATEGORIES, DEFAULT_PRIORITY, suggestCategory, suggestDescription } from "@/utils/helpers";

export const Route = createFileRoute("/consumer/submit")({
  head: () => meta("Submit Complaint", "Report an electricity problem with category, location and photos."),
  component: Submit,
});

interface PendingImage {
  file: File;
  preview: string;
}

const PRIO_DOT = {
  Emergency: "bg-destructive",
  High: "bg-primary",
  Normal: "bg-foreground/35",
} as const;

function SuccessLottie() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: false,
      autoplay: true,
      animationData: successAnimation,
    });
    return () => anim.destroy();
  }, []);

  return <div ref={containerRef} className="mx-auto h-32 w-32" aria-hidden="true" />;
}

function Submit() {
  const { complaints, currentUser, addComplaint } = useStore();
  const [category, setCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({});
  const [images, setImages] = useState<PendingImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [thinking, setThinking] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<Category | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const addImages = (list: FileList | null) => {
    if (!list) return;
    const accepted: PendingImage[] = [];
    for (const file of Array.from(list)) {
      const problem = validateImage(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
    }
    setImages((prev) => {
      const merged = [...prev, ...accepted];
      merged.slice(4).forEach((i) => URL.revokeObjectURL(i.preview));
      return merged.slice(0, 4);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index]?.preview ?? "");
      return prev.filter((_, j) => j !== index);
    });
  };

  const clearImages = () => {
    images.forEach((i) => URL.revokeObjectURL(i.preview));
    setImages([]);
  };

  const similar = useMemo(() => {
    if (!category || address.trim().length < 4) return [];
    const words = address.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 3);
    return complaints.filter(
      (c) => c.status !== "Resolved" && c.category === category && words.some((w) => c.address.toLowerCase().includes(w)),
    );
  }, [category, address, complaints]);

  const runAI = () => {
    const text = `${title} ${description}`;
    if (text.trim().length < 5) return toast.error("Write a title or description first so we can analyse it.");
    setThinking(true);
    setAiSuggestion(null);
    setTimeout(() => {
      setAiSuggestion(suggestCategory(text) ?? "Other");
      setThinking(false);
    }, 650);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!category) er.category = "Select a category.";
    if (title.trim().length < 5) er.title = "Title must be at least 5 characters.";
    if (description.trim().length < 15) er.description = "Please describe the issue (min 15 characters).";
    if (address.trim().length < 5) er.address = "Enter the location / address.";
    setErrs(er);
    if (Object.keys(er).length || !category || !currentUser || submitting) return;

    setSubmitting(true);
    const upload = await uploadImages(
      images.map((i) => i.file),
      currentUser.id,
    );
    if (upload.error) {
      setSubmitting(false);
      toast.error(upload.error);
      return;
    }

    const now = new Date().toISOString();
    const c: Complaint = {
      id: "",
      title: title.trim(),
      description: description.trim(),
      category,
      priority: DEFAULT_PRIORITY[category],
      status: "Submitted",
      address: address.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      consumerId: currentUser.id,
      createdAt: now,
      updatedAt: now,
      images: upload.urls,
      evidence: { before: [], after: [] },
      history: [{ status: "Submitted", at: now, by: "Consumer" }],
      notes: [],
      progress: 0,
      duplicateOf: similar[0]?.id,
    };
    const newId = await addComplaint(c);
    setSubmitting(false);
    if (newId) {
      clearImages();
      setDone(newId);
    }
  };

  if (done) {
    return (
      <div className="mx-auto my-8 max-w-lg rounded-3xl border border-foreground/10 bg-card p-10 text-center shadow-xs">
        <SuccessLottie />
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Complaint Submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your tracking ID is</p>
        <p className="mt-2 inline-block rounded-full bg-surface px-5 py-1.5 font-mono text-xl font-bold text-primary">
          {done}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          An administrator will review it shortly and dispatch a field crew. You&apos;ll be notified at every milestone.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/complaints/$id"
            params={{ id: done }}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-background transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Track Complaint <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setCategory(null);
              setTitle("");
              setDescription("");
              setAddress("");
              setCoords({});
              clearImages();
              setAiSuggestion(null);
            }}
            className="inline-flex h-11 items-center rounded-full border border-foreground/15 bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "h-12 w-full rounded-2xl border border-foreground/12 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            <Zap className="h-3 w-3" /> New Report
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Submit a Complaint</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us what&apos;s wrong, where it is, and attach optional photos so our crews arrive prepared.
          </p>
        </div>
        <Link
          to="/consumer"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-12">
        {/* Left Main Form (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Step 1: Category Grid */}
          <section className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight">1. Issue Category *</h2>
              <span className="text-xs text-muted-foreground">Select one</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {CATEGORIES.map((c) => {
                const selected = category === c;
                const prio = DEFAULT_PRIORITY[c];
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-colors",
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground/10 bg-background text-foreground hover:border-foreground/30",
                    )}
                  >
                    <span className="text-sm font-semibold leading-snug">{c}</span>
                    <span
                      className={cn(
                        "mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium",
                        selected ? "text-background/75" : "text-muted-foreground",
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", selected ? "bg-primary" : PRIO_DOT[prio])} />
                      {prio}
                    </span>
                  </button>
                );
              })}
            </div>
            {errs.category && <p className="mt-2.5 text-xs font-medium text-destructive">{errs.category}</p>}
          </section>

          {/* Step 2: Details & Location */}
          <section className="space-y-5 rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-7">
            <h2 className="text-base font-bold tracking-tight">2. Details &amp; Location *</h2>

            <div className="space-y-1.5">
              <label htmlFor="title" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Title
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Live wire hanging low near school gate"
                className={inputClass}
              />
              {errs.title && <p className="text-xs font-medium text-destructive">{errs.title}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="desc"
                  className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Description
                </label>
                {category && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => setDescription(suggestDescription(category, address))}
                  >
                    Use suggested description
                  </button>
                )}
              </div>
              <textarea
                id="desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you see, since when it started, and any safety hazard."
                className="w-full rounded-2xl border border-foreground/12 bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none"
              />
              {errs.description && <p className="text-xs font-medium text-destructive">{errs.description}</p>}
            </div>

            <MapboxLocationPicker
              address={address}
              latitude={coords.latitude}
              longitude={coords.longitude}
              onChange={(next) => {
                setAddress(next.address);
                setCoords({ latitude: next.latitude, longitude: next.longitude });
              }}
              error={errs.address}
            />

            {similar.length > 0 && (
              <div className="flex gap-3 rounded-2xl border border-warning/40 bg-warning-soft p-4 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="font-semibold text-foreground">Similar complaint already reported nearby</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {similar.slice(0, 2).map((s) => (
                      <span key={s.id} className="block">
                        <span className="font-mono font-semibold text-foreground">{s.id}</span> — {s.title} ({s.status})
                      </span>
                    ))}
                    You can still submit; it will be flagged for admin review.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Step 3: Photos */}
          <section className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight">3. Site Photos (optional)</h2>
              <span className="text-xs text-muted-foreground">{images.length} / 4 photos · max 5 MB each</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={img.preview} className="relative h-24 w-24 overflow-hidden rounded-2xl border border-foreground/12">
                  <img src={img.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-foreground/20 bg-background text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
                  <ImagePlus className="h-5 w-5" /> Add photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addImages(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </section>

          {/* Submit CTA Pill — compact, centered text, right below photos */}
          <div className="flex justify-start">
            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-primary px-8 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : (
                <>
                  <span>Submit Complaint</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side Column (4 cols) */}
        <aside className="space-y-5 lg:col-span-4">
          {/* Smart Assistant Card (Ink Black) */}
          <section className="rounded-3xl bg-foreground p-6 text-background shadow-sm">
            <div className="flex items-center gap-2.5 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <span>Smart Category Helper</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-background/70">
              Not sure which category fits? Write your title or description and we&apos;ll match the right one.
            </p>
            <button
              type="button"
              onClick={runAI}
              disabled={thinking}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-card text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
            >
              {thinking ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing…
                </>
              ) : (
                "Suggest Category"
              )}
            </button>

            {aiSuggestion && (
              <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-3.5 text-sm">
                <p className="text-xs text-background/75">Suggested match:</p>
                <p className="mt-0.5 font-bold text-background">{aiSuggestion}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(aiSuggestion);
                      if (!description) setDescription(suggestDescription(aiSuggestion, address));
                    }}
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSuggestion(null)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-background/70 hover:text-background"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Priority Info Card */}
          <section className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs">
            <div className="flex items-center gap-2 font-bold">
              <Info className="h-4 w-4 text-primary" /> Priority Routing
            </div>
            {category ? (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Assigned level:</span>
                <PriorityBadge priority={DEFAULT_PRIORITY[category]} />
              </div>
            ) : (
              <p className="mt-2.5 text-xs text-muted-foreground">Select a category to preview automatic priority.</p>
            )}
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              <li>
                <strong className="text-foreground">Emergency</strong> — immediate danger (broken wires, fallen poles).
              </li>
              <li>
                <strong className="text-foreground">High</strong> — area power outages or transformer faults.
              </li>
              <li>
                <strong className="text-foreground">Normal</strong> — meter faults and household connections.
              </li>
            </ul>
          </section>
        </aside>
      </form>
    </div>
  );
}
