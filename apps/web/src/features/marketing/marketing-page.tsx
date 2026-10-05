import { useState } from "react"
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  ChevronRight,
  CircleDot,
  Code2,
  GitBranch,
  GitFork,
  GitPullRequest,
  Menu,
  Radio,
  ScanLine,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import { Brand } from "@workspace/shared/components/brand"
import { AppPreview } from "@/features/marketing/components/workflow-preview"
import { PullRequestDialog } from "@/features/marketing/components/pull-request-dialog"
import { PilotDialog } from "@/features/marketing/components/pilot-dialog"

const steps = [
  {
    icon: Radio,
    title: "Catch the change",
    description:
      "Official release notes, SDK updates, and migration guides. Filtered to the integration you actually use.",
  },
  {
    icon: ScanLine,
    title: "Prove the impact",
    description:
      "Trace the change to your code. Reproduce a failure against the behavior you’ve approved.",
  },
  {
    icon: GitPullRequest,
    title: "Review the repair",
    description:
      "Get a focused pull request with the source, the diff, and reproducible before-and-after evidence.",
  },
]

const faqs = [
  [
    "What can rebnd maintain?",
    "The initial scope is one GitHub repository, one TypeScript and Node.js application, and one approved workflow. Direct SDK calls and shallow wrappers are supported. The first provider will be selected with pilot teams; the subscription example on this page is illustrative.",
  ],
  [
    "How is this different from a dependency update bot?",
    "A version bump tells you what changed in your dependencies. Rebnd is designed to connect an official provider change to your workflow, reproduce the impact, and prepare a bounded repair with comparative evidence.",
  ],
  [
    "Will rebnd merge or deploy changes?",
    "No. You approve the workflow, assertions, allowed edits, and publishing mode. Rebnd prepares a pull request only after the required checks pass. Your team reviews, merges, and deploys through its existing process.",
  ],
  [
    "What happens when a change can’t be verified?",
    "Rebnd stops with a specific blocker or requests manual review. Ambiguous behavior, unsupported code paths, unhealthy baselines, or missing target-version evidence cannot be labeled verified and block automatic PR publication.",
  ],
  [
    "Does rebnd need production access?",
    "No. Synthetic fixtures are the default. Any provider sandbox access must be separately authorized and test-only. Production credentials and payloads are outside the product’s scope.",
  ],
  [
    "Is rebnd available yet?",
    "Rebnd is in development for an initial pilot with small SaaS engineering teams. Provider support and pricing are not finalized. You can explore the fixture-based example here and check whether your workflow fits the planned pilot.",
  ],
]

export function MarketingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [prOpen, setPrOpen] = useState(false)
  const [pilotOpen, setPilotOpen] = useState(false)
  const nav = [
    { label: "How it works", href: "#how-it-works" },
    { label: "The evidence", href: "#evidence" },
    { label: "Built for trust", href: "#trust" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Sign in", href: "/auth" },
  ]
  return (
    <>
      <a
        href="#main"
        className="sr-only fixed top-3 left-3 z-50 rounded bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only"
      >
        Skip to content
      </a>
      <header className="relative z-30">
        <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between px-6 md:px-10">
          <Brand />
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-8 md:flex"
          >
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="hidden h-9 gap-3 rounded-none border-border bg-transparent px-4 text-xs sm:inline-flex"
              render={<a href="/dashboard" />}
            >
              Open dashboard
              <ArrowUpRight className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-16 space-y-1 border-b bg-card p-5 md:hidden"
          >
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded p-3 text-sm hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
            <Button
              className="mt-3 w-full"
              onClick={() => {
                setMenuOpen(false)
                setPilotOpen(true)
              }}
            >
              Meet the pilot
              <ArrowUpRight />
            </Button>
          </nav>
        )}
      </header>
      <main id="main">
        <section className="relative isolate mx-3 overflow-hidden rounded-none border-2 border-primary/50 bg-black shadow-[5px_5px_0_var(--border)] sm:mx-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <img
              src="/hero-dither.png"
              alt=""
              className="hero-art absolute inset-0 h-full w-full object-cover opacity-90"
            />
          </div>
          <div className="page-shell flex min-h-[600px] flex-col items-center justify-center py-20 text-center sm:min-h-[610px] md:py-24">
            <a
              href="#how-it-works"
              className="mb-7 inline-flex items-center gap-2.5 text-xs text-foreground/75"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              Introducing rebnd
              <span className="mx-0.5 h-3 w-px bg-primary/20" />
              <span className="text-foreground/75">
                Built to keep you connected
              </span>
              <ChevronRight className="size-3" />
            </a>
            <h1 className="mx-auto max-w-[850px] font-heading text-[clamp(2.7rem,5.5vw,4.5rem)] leading-[1.03] font-medium tracking-[-0.045em]">
              Keep your integrations
              <br />
              <span className="inline-block bg-primary px-3 pb-1 text-primary-foreground">
                moving forward.
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-[520px] text-sm leading-[1.85] text-foreground/75 sm:text-base">
              The integration maintenance agent that turns provider changes
              <br className="hidden sm:block" /> into focused pull requests.
              With proof, not guesswork.
            </p>
            <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                render={<a href="#how-it-works" />}
                className="h-11 w-full gap-7 rounded-none px-5 text-xs sm:w-auto"
              >
                See how it works
                <ArrowRight className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setPrOpen(true)}
                className="h-11 w-full gap-2.5 rounded-none border-white/45 bg-black px-5 text-xs sm:w-auto"
              >
                <GitPullRequest className="size-3.5" />
                View example PR
              </Button>
            </div>
            <p className="mt-5 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <ShieldCheck className="size-3" />
              You approve the scope. You decide what ships.
            </p>
          </div>
        </section>
        <div className="page-shell flex flex-wrap items-center justify-between gap-5 border-b py-6">
          <p className="text-[11px] text-muted-foreground">
            Built around the stack you already ship.
          </p>
          <div className="flex items-center gap-7 text-sm text-foreground/65 sm:gap-10">
            <span className="flex items-center gap-2">
              <GitFork className="size-4" />
              GitHub
            </span>
            <span className="flex items-center gap-2">
              <span className="flex size-4 items-end justify-end rounded-[2px] bg-foreground/65 pr-0.5 pb-px text-[9px] leading-none font-bold text-background">
                TS
              </span>
              TypeScript
            </span>
            <span className="flex items-center gap-2">
              <Code2 className="size-4" />
              Node.js
            </span>
          </div>
        </div>
        <section
          id="how-it-works"
          className="page-shell pt-24 pb-20 md:pt-28 md:pb-24"
        >
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-4 text-primary">
                01 / From change to confidence
              </p>
              <h2 className="section-heading">
                Less chasing changelogs.
                <br />
                <span className="text-muted-foreground">
                  More shipping your product.
                </span>
              </h2>
            </div>
            <p className="max-w-[290px] text-sm leading-7 text-muted-foreground">
              Your integrations don’t stand still.
              <br />
              Rebnd connects what changed upstream
              <br className="hidden lg:block" /> to what needs your attention.
            </p>
          </div>
          <div className="mt-12 grid gap-9 md:mt-14 md:grid-cols-3 md:gap-10">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="border-t pt-6">
                <div className="mb-5 flex items-center justify-between">
                  <Icon className="size-5 text-primary" strokeWidth={1.5} />
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mb-3 font-heading text-xl font-normal">
                  {title}
                </h3>
                <p className="max-w-xs text-xs leading-[1.9] text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section id="evidence" className="border-y bg-[#0e1310] py-20 md:py-24">
          <div className="page-shell">
            <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow mb-4 text-primary">
                  02 / The proof is in the pull request
                </p>
                <h2 className="section-heading">
                  A small diff.
                  <br />
                  The whole story.
                </h2>
              </div>
              <p className="max-w-[330px] text-sm leading-7 text-muted-foreground">
                See the source. Understand the impact.
                <br />
                Compare the results. Then make the call.
              </p>
            </div>
            <AppPreview onOpen={() => setPrOpen(true)} />
            <div className="mt-5 flex flex-col justify-between gap-2 text-[10px] text-muted-foreground sm:flex-row">
              <span className="flex items-center gap-2">
                <CircleDot className="size-3" />
                An illustrative subscription workflow. No live repository
                connected.
              </span>
              <span>
                Explore the change, patch, and proof above
                <ArrowUpRight className="ml-1 inline size-3" />
              </span>
            </div>
          </div>
        </section>
        <section
          id="trust"
          className="page-shell grid gap-12 py-24 md:grid-cols-[1fr_1fr] md:gap-20 md:py-28"
        >
          <div>
            <p className="eyebrow mb-4 text-primary">
              03 / Autonomy with boundaries
            </p>
            <h2 className="section-heading">
              Your repo.
              <br />
              Your rules.
              <br />
              <span className="text-primary">Your merge.</span>
            </h2>
            <p className="mt-6 max-w-[330px] text-sm leading-7 text-muted-foreground">
              Give rebnd a defined workflow, not the keys to production. Every
              repair stays inside the boundaries you approve.
            </p>
            <a
              href="#questions"
              className="mt-7 inline-flex items-center gap-3 text-xs hover:text-primary"
            >
              A few things worth knowing
              <ArrowDown className="size-3.5" />
            </a>
          </div>
          <div className="space-y-0">
            {[
              {
                icon: ShieldCheck,
                title: "An explicit scope",
                text: "One selected repository. One approved workflow. Only the paths and repair types you allow.",
              },
              {
                icon: Terminal,
                title: "Isolated by design",
                text: "Checks run in disposable environments with synthetic fixtures. No production credentials or payloads.",
              },
              {
                icon: CheckCheck,
                title: "Assertions that don’t move",
                text: "The same approved tests run before and after. The agent can’t weaken an assertion to make a patch pass.",
              },
              {
                icon: GitBranch,
                title: "A human at the finish line",
                text: "Rebnd prepares the PR. Your team reviews, merges, and deploys. Unclear evidence stops the process.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="flex gap-4 border-b py-6 first:pt-0 last:border-0 last:pb-0"
              >
                <div className="mt-0.5 rounded-md border bg-card p-2.5">
                  <Icon className="size-4 text-primary/80" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="mb-2 font-heading text-lg">{title}</h3>
                  <p className="text-xs leading-6 text-muted-foreground">
                    {text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="questions" className="border-t">
          <div className="page-shell grid gap-10 py-20 md:grid-cols-[1fr_1.35fr] md:gap-20">
            <div>
              <p className="eyebrow mb-4 text-primary">A little more context</p>
              <h2 className="section-heading">
                Good questions.
                <br />
                Clear answers.
              </h2>
            </div>
            <Accordion>
              {faqs.map(([question, answer], index) => (
                <AccordionItem key={question} value={index}>
                  <AccordionTrigger className="py-5 text-sm font-normal hover:text-primary hover:no-underline">
                    {question}
                  </AccordionTrigger>
                  <AccordionContent className="pr-5 pb-5 text-xs leading-7 text-muted-foreground">
                    {answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
        <section className="page-shell pb-20">
          <div className="relative isolate overflow-hidden rounded-none border-2 border-primary/40 bg-card px-6 py-16 text-center sm:py-20">
            <div
              aria-hidden="true"
              className="dot-field pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_right,black,transparent_35%,transparent_65%,black)] opacity-70"
            />
            <p className="eyebrow mb-5 text-primary">
              Keep the connection. Lose the busywork.
            </p>
            <h2 className="section-heading">
              Your next feature is waiting.
              <br />
              <span className="text-muted-foreground">
                Your integrations shouldn’t be.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Start with one workflow that matters to your product.
              <br className="hidden sm:block" />
              Build confidence one verified change at a time.
            </p>
            <Button
              className="mt-7 h-11 gap-6 rounded-none px-5 text-xs"
              onClick={() => setPilotOpen(true)}
            >
              Find your first workflow
              <ArrowRight className="size-3.5" />
            </Button>
            <p className="mt-4 text-[10px] text-muted-foreground">
              In development · A focused pilot for small engineering teams
            </p>
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="page-shell flex flex-col justify-between gap-7 py-9 sm:flex-row sm:items-center">
          <div>
            <Brand small />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Keep building. Stay connected.
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-7 text-[11px] text-muted-foreground"
          >
            <a href="#how-it-works" className="hover:text-primary">
              How it works
            </a>
            <a href="#trust" className="hover:text-primary">
              Our boundaries
            </a>
            <a href="#questions" className="hover:text-primary">
              Questions
            </a>
          </nav>
          <p className="text-[10px] text-muted-foreground">© 2026 rebnd</p>
        </div>
      </footer>
      <PullRequestDialog open={prOpen} onOpenChange={setPrOpen} />
      <PilotDialog open={pilotOpen} onOpenChange={setPilotOpen} />
    </>
  )
}
