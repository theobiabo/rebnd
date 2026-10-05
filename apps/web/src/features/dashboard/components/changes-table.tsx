import { ArrowUpRight, FileCode2, Search } from "lucide-react"
import { useState } from "react"
import { ChangeBadge } from "./change-badge"
import type { Change } from "@workspace/shared/types/integration"

export function ChangesTable({
  changes,
  compact = false,
}: {
  changes: Change[]
  compact?: boolean
}) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All changes")
  const filtered = changes.filter(
    (change) =>
      (filter === "All changes" || change.status === filter) &&
      `${change.title} ${change.id}`
        .toLowerCase()
        .includes(search.toLowerCase())
  )
  return (
    <section className="neo-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg font-medium">
            {compact ? "Changes that matter" : "Provider changes"}
          </h2>
          <span className="border bg-secondary px-1.5 font-mono text-[10px]">
            {changes.length.toString().padStart(2, "0")}
          </span>
        </div>
        {compact ? (
          <a
            href="/dashboard/changes"
            className="flex items-center gap-2 text-[11px] hover:underline"
          >
            All changes
            <ArrowUpRight className="size-3.5" />
          </a>
        ) : (
          <select
            aria-label="Filter changes by status"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="border bg-background px-3 py-2 text-xs"
          >
            {[
              "All changes",
              "Needs review",
              "Ready",
              "Verified",
              "Blocked",
              "Ignored",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        )}
      </div>
      {!compact && (
        <div className="flex items-center gap-2 border-b border-border/20 px-5 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            aria-label="Search changes"
            placeholder="Search by change or ID…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-transparent py-1 text-sm outline-none"
          />
        </div>
      )}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[570px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border/20 bg-background font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
              <th className="px-5 py-3 font-normal">
                Change / affected workflow
              </th>
              <th className="px-4 py-3 font-normal">Target</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="w-10">
                <span className="sr-only">Open change</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((change) => (
              <tr
                key={change.id}
                className="group border-b border-border/15 last:border-0 hover:bg-primary/8"
              >
                <td className="px-5 py-4">
                  <a
                    href={`/dashboard/changes/${change.id}`}
                    className="block text-xs leading-5 font-medium group-hover:underline"
                  >
                    {change.title}
                  </a>
                  <p className="mt-1.5 flex items-center gap-2 font-mono text-[9px] text-muted-foreground">
                    <FileCode2 className="size-3" />
                    {change.id}
                    <span>·</span>Subscription entitlement
                  </p>
                </td>
                <td className="px-4 py-4 font-mono text-[10px] text-muted-foreground">
                  {change.version}
                </td>
                <td className="px-4 py-4">
                  <ChangeBadge status={change.status} />
                </td>
                <td className="pr-4">
                  <a
                    href={`/dashboard/changes/${change.id}`}
                    aria-label={`Review ${change.id}`}
                  >
                    <ArrowUpRight className="size-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          No changes match these filters. Try another status or search.
        </div>
      )}
    </section>
  )
}
