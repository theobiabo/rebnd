import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

export function PilotDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const requirements = [
    "A TypeScript / Node.js app in GitHub",
    "One external API workflow to protect",
    "An engineer who can approve expected behavior",
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border p-6 sm:max-w-lg sm:p-8">
        <DialogHeader>
          <p className="eyebrow mb-2 text-primary">The first rebnd workflows</p>
          <DialogTitle className="font-heading text-3xl font-light">
            Start with one integration.
          </DialogTitle>
          <DialogDescription className="leading-6">
            We’re shaping a focused pilot for small SaaS teams. Check how your
            workflow fits the initial scope.
          </DialogDescription>
        </DialogHeader>
        <div className="my-3 space-y-3">
          {requirements.map((item) => (
            <label
              key={item}
              className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-4 text-sm leading-5"
            >
              <input
                type="checkbox"
                checked={selected.includes(item)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, item]
                      : current.filter((value) => value !== item)
                  )
                }
                className="mt-0.5 size-4 accent-primary"
              />
              {item}
            </label>
          ))}
        </div>
        <div
          className="rounded-lg border border-primary/20 bg-primary/5 p-4"
          aria-live="polite"
        >
          <p className="text-sm text-primary">
            {selected.length === 3
              ? "Your workflow fits the planned pilot scope."
              : `${selected.length} of 3 pilot requirements matched`}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {selected.length === 3
              ? "Next, identify the provider, the workflow entrypoint, and the behavior you need preserved. Provider support will be confirmed before onboarding."
              : "The pilot starts with a narrow, reproducible workflow. Broader language and provider support will follow what we learn."}
          </p>
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">
          This is a local readiness check, not a signup. No information is
          collected or sent.
        </p>
      </DialogContent>
    </Dialog>
  )
}
