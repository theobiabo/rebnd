import type { ReactNode } from "react"
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  GitPullRequest,
  Radio,
  ShieldCheck,
} from "lucide-react"
import { Brand } from "@workspace/shared/components/brand"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="dashboard-theme grid min-h-dvh bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
      <section className="relative isolate hidden min-h-dvh flex-col overflow-hidden border-r-2 border-border bg-[#0b0b0b] p-10 lg:flex xl:p-14">
        <img
          src="/hero-dither.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-50"
        />
        <Brand />
        <div className="my-auto py-16">
          <p className="mb-7 inline-flex items-center gap-2 border border-white/25 bg-background/80 px-3 py-1.5 font-mono text-[9px] tracking-[0.15em] uppercase">
            <span className="size-1.5 bg-foreground" />
            The integration maintenance agent
          </p>
          <p className="max-w-lg font-heading text-[clamp(3.5rem,4.8vw,5rem)] leading-[1.04] font-light tracking-[-0.05em]">
            Keep building.
            <br />
            <span className="text-muted-foreground">Stay connected.</span>
          </p>
          <p className="mt-7 max-w-[355px] text-sm leading-7 text-muted-foreground">
            From an upstream change to a focused pull request. With the evidence
            you need to make the call.
          </p>
          <div className="mt-12 max-w-[420px] border-2 border-border bg-card shadow-[5px_5px_0_#000]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 font-mono text-[9px] tracking-wide uppercase">
              <span>One workflow. Full context.</span>
              <span className="text-muted-foreground">rebnd / 001</span>
            </div>
            <div className="space-y-0 px-4">
              {[
                { icon: Radio, label: "Understand the change", number: "01" },
                {
                  icon: ShieldCheck,
                  label: "Inspect the evidence",
                  number: "02",
                },
                {
                  icon: GitPullRequest,
                  label: "Decide what ships",
                  number: "03",
                },
              ].map(({ icon: Icon, label, number }) => (
                <div
                  key={number}
                  className="flex items-center gap-3 border-b border-border/60 py-4 last:border-b-0"
                >
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {number}
                  </span>
                  <Icon className="size-4" strokeWidth={1.5} />
                  <span className="text-xs">{label}</span>
                  <Check className="ml-auto size-3 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border pt-5 font-mono text-[9px] text-muted-foreground">
          <span>YOUR REPO. YOUR RULES. YOUR MERGE.</span>
          <a
            href="/#trust"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            Our boundaries
            <ArrowUpRight className="size-3" />
          </a>
        </div>
      </section>
      <section className="flex min-h-dvh flex-col bg-card px-6 py-7 sm:px-10 lg:px-12 lg:py-10">
        <div className="flex items-center justify-between">
          <span className="lg:hidden">
            <Brand />
          </span>
          <a
            href="/"
            className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Back to rebnd
          </a>
        </div>
        <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-14">
          {children}
        </div>
        <p className="text-center font-mono text-[9px] tracking-wide text-muted-foreground">
          REBND / HUMAN REVIEW, ALWAYS.
        </p>
      </section>
    </main>
  )
}
