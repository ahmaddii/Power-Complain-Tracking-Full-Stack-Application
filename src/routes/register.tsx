import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Clock, Eye, EyeOff, HardHat, Loader2, MailCheck, User, Zap } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => meta("Create account", "Register as a consumer or apply as a field worker on Power-Track."),
  component: Register,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden="true">
      <path d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.38-1.4 4.05-5.27 4.05-3.17 0-5.76-2.63-5.76-5.88s2.59-5.88 5.76-5.88c1.81 0 3.02.77 3.71 1.44l2.53-2.44C16.79 3.85 14.68 3 12.17 3 7.1 3 3 7.14 3 12.25s4.1 9.25 9.17 9.25c5.29 0 8.8-3.72 8.8-8.96 0-.6-.06-1.06-.15-1.44Z" />
    </svg>
  );
}

const CONSUMER_HIGHLIGHTS = [
  "Submit electrical faults with photos in under 60 seconds",
  "Automatic emergency routing for live wires & fallen poles",
  "Follow live field-crew updates with before & after proof",
] as const;

const WORKER_HIGHLIGHTS = [
  "Receive assigned field tasks sorted by emergency priority",
  "Open exact Mapbox pin coordinates for poles & transformers",
  "Log on-site repair progress and upload before & after proof",
] as const;

function Register() {
  const { register, loginWithOAuth } = useStore();
  const navigate = useNavigate();
  const [role, setRole] = useState<"consumer" | "worker">("consumer");
  const [f, setF] = useState({ name: "", email: "", phone: "", area: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = "Enter a valid email.";
    if (!/^[+\d][\d\s-]{6,}$/.test(f.phone.trim())) er.phone = "Enter a valid phone number.";
    if (role === "worker" && f.area.trim().length < 2) er.area = "Enter your service zone / area.";
    if (f.password.length < 6) er.password = "At least 6 characters.";
    if (f.confirm !== f.password) er.confirm = "Passwords do not match.";
    setErrs(er);
    if (Object.keys(er).length) return;

    setLoading(true);
    const res = await register({
      name: f.name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      area: role === "worker" ? f.area.trim() : undefined,
      role,
      password: f.password,
    });
    setLoading(false);

    if (res.error) return setFormErr(res.error);
    if (res.pendingApproval) {
      setPendingApproval(true);
      return;
    }
    if (res.needsConfirmation) {
      setConfirmEmail(true);
      return;
    }
    if (res.user) {
      toast.success("Account created");
      navigate({ to: "/consumer" });
    }
  };

  const handleGoogle = async () => {
    setFormErr(null);
    setOauthLoading(true);
    const { error } = await loginWithOAuth("google");
    if (error) {
      setOauthLoading(false);
      setFormErr(error);
    }
  };

  const inputClass =
    "h-11 w-full rounded-full border border-foreground/12 bg-card px-5 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none";

  const isWorker = role === "worker";

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      {/* Left Side: Solid Ink-Black Branding Panel */}
      <aside className="hidden flex-col justify-between bg-foreground p-10 text-background lg:flex xl:p-14">
        <Link to="/" className="inline-flex w-fit items-center gap-2.5 font-bold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Zap className="h-4 w-4 fill-current" />
          </span>
          <span className="text-base">Power-Track</span>
        </Link>

        <div className="max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {isWorker ? "Field Crew Portal" : "Consumer Portal"}
          </span>
          <h2 className="mt-5 font-serif text-4xl font-normal leading-[1.08] tracking-[-0.02em] text-background xl:text-5xl">
            {isWorker ? (
              <>
                Respond faster.
                <br />
                Restore power safely.
              </>
            ) : (
              <>
                Report power problems.
                <br />
                Track every fix.
              </>
            )}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-background/70">
            {isWorker
              ? "Field worker accounts are reviewed and approved by an administrator before dispatch access is granted."
              : "One account connects you directly with utility dispatchers and on-site technicians until power is restored."}
          </p>

          <ul className="mt-8 space-y-3.5">
            {(isWorker ? WORKER_HIGHLIGHTS : CONSUMER_HIGHLIGHTS).map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-background/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-background/55">
          <span>© {new Date().getFullYear()} Power-Track</span>
          <span className="inline-flex items-center gap-2 text-background/75">
            <span className="h-2 w-2 rounded-full bg-success" />
            24/7 Dispatch Ready
          </span>
        </div>
      </aside>

      {/* Right Side: Registration Form Panel */}
      <main className="flex flex-col justify-between px-5 py-5 sm:px-10 lg:px-14 lg:py-7">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="inline-flex items-center gap-2 font-bold tracking-tight lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
              <Zap className="h-4 w-4 fill-primary text-primary" />
            </span>
            <span className="text-sm">Power-Track</span>
          </Link>
          <Link
            to="/login"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-3">
          {pendingApproval ? (
            <div className="rounded-3xl border border-foreground/10 bg-card p-8 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
                <Clock className="h-6 w-6" />
              </span>
              <h1 className="mt-4 font-serif text-3xl font-normal">Pending Admin Approval</h1>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                Your Field Worker application for <strong className="text-foreground">{f.email}</strong> has been
                submitted. An administrator will review and approve your account before you can sign in.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Back to Sign In
              </Link>
            </div>
          ) : confirmEmail ? (
            <div className="rounded-3xl border border-foreground/10 bg-card p-8 text-center shadow-sm">
              <MailCheck className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-4 font-serif text-3xl font-normal">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to <strong className="text-foreground">{f.email}</strong>. Verify your
                email, then sign in.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h1 className="font-serif text-4xl font-normal leading-[1.08] tracking-[-0.02em] text-foreground">
                  Create your account
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {isWorker
                    ? "Apply for a Field Worker account (requires administrator approval)."
                    : "Register as a consumer to report and track electricity issues."}
                </p>
              </div>

              {/* Clean Segmented Role Toggle */}
              <div className="mt-5 grid grid-cols-2 rounded-full border border-foreground/12 bg-card p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRole("consumer");
                    setErrs({});
                  }}
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-full text-xs font-bold transition-colors",
                    role === "consumer"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <User className={cn("h-3.5 w-3.5", role === "consumer" && "text-primary")} /> Consumer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole("worker");
                    setErrs({});
                  }}
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-full text-xs font-bold transition-colors",
                    role === "worker"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <HardHat className={cn("h-3.5 w-3.5", role === "worker" && "text-primary")} /> Field Worker
                </button>
              </div>

              <form onSubmit={submit} noValidate autoComplete="off" className="mt-5 space-y-3">
                <div>
                  <label htmlFor="reg-name" className="sr-only">
                    Full name
                  </label>
                  <input
                    id="reg-name"
                    name="reg_name"
                    type="text"
                    autoComplete="off"
                    value={f.name}
                    onChange={set("name")}
                    placeholder="Full name"
                    className={inputClass}
                  />
                  {errs.name && <p className="mt-1 pl-4 text-xs text-destructive">{errs.name}</p>}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="reg-email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="reg-email"
                      name="reg_email"
                      type="email"
                      autoComplete="off"
                      value={f.email}
                      onChange={set("email")}
                      placeholder="Email address"
                      className={inputClass}
                    />
                    {errs.email && <p className="mt-1 pl-4 text-xs text-destructive">{errs.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="reg-phone" className="sr-only">
                      Phone number
                    </label>
                    <input
                      id="reg-phone"
                      name="reg_phone"
                      type="tel"
                      autoComplete="off"
                      value={f.phone}
                      onChange={set("phone")}
                      placeholder="Phone number"
                      className={inputClass}
                    />
                    {errs.phone && <p className="mt-1 pl-4 text-xs text-destructive">{errs.phone}</p>}
                  </div>
                </div>

                {isWorker && (
                  <div>
                    <label htmlFor="reg-area" className="sr-only">
                      Service Zone / Area
                    </label>
                    <input
                      id="reg-area"
                      name="reg_area"
                      type="text"
                      autoComplete="off"
                      value={f.area}
                      onChange={set("area")}
                      placeholder="Service zone / area (e.g. Sector I-8, North Zone)"
                      className={inputClass}
                    />
                    {errs.area && <p className="mt-1 pl-4 text-xs text-destructive">{errs.area}</p>}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="relative">
                      <label htmlFor="reg-password" className="sr-only">
                        Password
                      </label>
                      <input
                        id="reg-password"
                        name="reg_password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={f.password}
                        onChange={set("password")}
                        placeholder="Password"
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errs.password && <p className="mt-1 pl-4 text-xs text-destructive">{errs.password}</p>}
                  </div>

                  <div>
                    <div className="relative">
                      <label htmlFor="reg-confirm" className="sr-only">
                        Confirm password
                      </label>
                      <input
                        id="reg-confirm"
                        name="reg_confirm"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        value={f.confirm}
                        onChange={set("confirm")}
                        placeholder="Confirm password"
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errs.confirm && <p className="mt-1 pl-4 text-xs text-destructive">{errs.confirm}</p>}
                  </div>
                </div>

                {formErr && (
                  <p className="rounded-full border border-destructive/30 bg-card px-4 py-2 text-center text-xs font-medium text-destructive">
                    {formErr}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-between rounded-full bg-foreground px-7 text-sm font-medium text-background shadow-md transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
                >
                  <span>
                    {loading
                      ? isWorker
                        ? "Submitting application…"
                        : "Creating account…"
                      : isWorker
                        ? "Apply as Field Worker"
                        : "Create Consumer Account"}
                  </span>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  )}
                </button>
              </form>

              {!isWorker && (
                <>
                  <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    <span>or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <button
                    type="button"
                    disabled={oauthLoading}
                    onClick={handleGoogle}
                    className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-foreground/15 bg-card px-6 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-foreground disabled:opacity-60"
                  >
                    {oauthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                    <span>Continue with Google</span>
                  </button>
                </>
              )}

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-foreground transition-colors hover:text-primary">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground lg:hidden">
          © {new Date().getFullYear()} Power-Track
        </div>
      </main>
    </div>
  );
}
