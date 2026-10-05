import { useState } from "react"
import { Search } from "lucide-react"
import { PageHeading } from "@workspace/shared/components/page-heading"
import type { DashboardModel } from "../hooks/use-dashboard-model"

export function ActivityPage({ model }: { model: DashboardModel }) {
  const [search, setSearch] = useState("")
  const events = model.state.activity.filter((event) =>
    `${event.action} ${event.detail} ${event.actor}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Audit history"
        title="Every decision leaves a trace."
        description="Approvals, changes, and controls in chronological order. Newest first."
      />
      <section className="neo-panel">
        <div className="flex items-center gap-3 border-b-2 px-5 py-4">
          <Search className="size-4" />
          <input
            aria-label="Search activity"
            placeholder="Search actions, actors, or change IDs…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="px-5">
          {events.map((event) => (
            <article
              key={event.id}
              className="grid grid-cols-[36px_1fr] gap-4 border-b border-border/20 py-5 last:border-0 sm:grid-cols-[60px_1fr_60px]"
            >
              <time className="pt-1 font-mono text-[10px] text-muted-foreground">
                {event.time}
              </time>
              <div>
                <h2 className="text-sm font-medium">{event.action}</h2>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {event.detail}
                </p>
              </div>
              <span className="hidden self-start border bg-background px-2 py-1 text-center font-mono text-[9px] sm:block">
                {event.actor}
              </span>
            </article>
          ))}
          {events.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No activity matches your search.
            </p>
          )}
        </div>
      </section>
    </>
  )
}
