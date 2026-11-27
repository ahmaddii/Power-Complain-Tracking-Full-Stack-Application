import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { homeFor, useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/login")({
  head: () => meta("Sign in", "Sign in to Power-Track as a consumer, administrator or field worker."),
  component: Login,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden="true">
      <path d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.38-1.4 4.05-5.27 4.05-3.17 0-5.76-2.63-5.76-5.88s2.59-5.88 5.76-5.88c1.81 0 3.02.77 3.71 1.44l2.53-2.44C16.79 3.85 14.68 3 12.17 3 7.1 3 3 7.14 3 12.25s4.1 9.25 9.17 9.25c5.29 0 8.8-3.72 8.8-8.96 0-.6-.06-1.06-.15-1.44Z" />
    </svg>
  );
}

function Login() {
  const { loginWithPassword, loginWithOAuth, currentUser, hydrated } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && currentUser) {
      navigate({ to: homeFor(currentUser.role) });
    }
  }, [hydrated, currentUser, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Enter a valid email address.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    setLoading(true);
    const { user, error } = await loginWithPassword(email, password);
    setLoading(false);
    if (error || !user) return setErr(error ?? "Unable to sign in.");
    toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
    navigate({ to: homeFor(user.role) });
  };

  const handleGoogle = async () => {
    setErr(null);
    setOauthLoading(true);
    const { error } = await loginWithOAuth("google");
    if (error) {
      setOauthLoading(false);
      setErr(error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-background px-5 py-4 text-foreground sm:px-10 sm:py-5">
      {/* Top Minimal Brand Bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
            <Zap className="h-4 w-4 fill-primary text-primary" />
          </span>
          <span className="text-sm">Power-Track</span>
        </Link>
        <Link
          to="/register"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Create Account
        </Link>
      </header>

      {/* Main Centered Editorial Sign-In Stage */}
      <main className="mx-auto my-auto w-full max-w-4xl py-4">
        {/* Top Pill Callout */}
        <div className="flex justify-center">
          <Link
            to="/register"
            className="group inline-flex items-center gap-3 rounded-full border border-foreground/10 bg-card py-1 pl-4 pr-1 text-xs shadow-sm transition-colors hover:border-foreground/25"
          >
            <span>
              <strong className="font-semibold text-foreground">New to Power-Track?</strong>{" "}
              <span className="text-muted-foreground">Create an account to report issues fast.</span>
            </span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>

        {/* Editorial Serif Title with Hand-Drawn Loop Highlight */}
        <div className="mt-5 text-center">
          <h1 className="font-serif text-4xl font-normal leading-[1.05] tracking-[-0.02em] text-foreground sm:text-5xl md:text-[3.5rem]">
            <span className="relative inline-block">
              <span className="relative z-10">Login</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 210 86"
                fill="none"
                className="pointer-events-none absolute -inset-x-4 -inset-y-2 h-[126%] w-[122%] text-primary"
              >
                <path
                  d="M28 18C68 4 166 4 192 26C214 45 190 74 114 78C44 82 6 66 10 41C13 21 64 11 154 15"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            to Your
            <br />
            Account
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Connect residents, dispatch administrators, and field crews to resolve every outage faster
          </p>
        </div>

        {err && (
          <div className="mx-auto mt-4 max-w-lg rounded-full border border-destructive/30 bg-card px-5 py-2 text-center text-xs font-medium text-destructive shadow-xs">
            {err}
          </div>
        )}

        {/* Symmetrical 2-Column Pill Form + "/" Divider + Google Only */}
        <div className="mt-8 grid items-center gap-5 md:grid-cols-[1fr_auto_1fr] md:gap-9">
          {/* Left Column: Credentials & Ink-Black Submit Pill */}
          <form onSubmit={submit} noValidate autoComplete="off" className="space-y-3">
            <div>
              <label htmlFor="login-email" className="sr-only">
                Email address
              </label>
              <input
                id="login-email"
                name="login_email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="h-12 w-full rounded-full border border-foreground/12 bg-card px-6 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
            </div>

            <div className="relative">
              <label htmlFor="login-password" className="sr-only">
                Password
              </label>
              <input
                id="login-password"
                name="login_password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-12 w-full rounded-full border border-foreground/12 bg-card pl-6 pr-12 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex h-12 w-full items-center justify-between rounded-full bg-foreground px-7 text-sm font-medium text-background shadow-md transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
            >
              <span>{loading ? "Signing in…" : "Login to Your Account"}</span>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </form>

          {/* Center Diagonal Slash Divider */}
          <div className="flex items-center justify-center">
            <span className="select-none text-xl font-medium text-foreground/75">/</span>
          </div>

          {/* Right Column: Google Sign-In Only */}
          <div className="flex flex-col justify-center">
            <button
              type="button"
              disabled={oauthLoading}
              onClick={handleGoogle}
              className="flex h-12 w-full items-center justify-center gap-3.5 rounded-full border border-foreground/15 bg-card px-6 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-foreground disabled:opacity-60"
            >
              {oauthLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
              <span>Sign in with Google Account</span>
            </button>
          </div>
        </div>

        {/* Bottom Centered Forgot Link */}
        <div className="mt-6 text-center">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            Forgot Password?
          </Link>
        </div>
      </main>

      {/* Subtle Bottom Footer */}
      <footer className="mx-auto w-full max-w-6xl text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Power-Track
      </footer>
    </div>
  );
}
