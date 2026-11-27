import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Zap } from "lucide-react";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-background px-5 py-6 text-foreground sm:px-10 sm:py-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight">
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
      </header>

      <main className="mx-auto my-auto w-full max-w-lg py-10">
        <div className="flex justify-center">
          <Link
            to="/login"
            className="group inline-flex items-center gap-3 rounded-full border border-foreground/10 bg-card py-1.5 pl-5 pr-1.5 text-xs shadow-sm transition-colors hover:border-foreground/25"
          >
            <span>
              <strong className="font-semibold text-foreground">Already have an account?</strong>{" "}
              <span className="text-muted-foreground">Sign in to your dashboard.</span>
            </span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>

        <div className="mt-7 text-center">
          <h1 className="font-serif text-4xl font-normal leading-[1.08] tracking-[-0.02em] text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mt-9 rounded-3xl border border-foreground/10 bg-card p-6 shadow-sm sm:p-8">{children}</div>
      </main>

      <footer className="mx-auto w-full max-w-6xl text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Power-Track
      </footer>
    </div>
  );
}
