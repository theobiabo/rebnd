import { Workflow } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <a
      href="/"
      aria-label="rebnd home"
      className={cn(
        "inline-flex items-center gap-2.5 font-heading font-medium tracking-[-0.06em]",
        small ? "text-2xl" : "text-[29px]"
      )}
    >
      <span className="relative flex size-7 items-center justify-center text-primary">
        <Workflow className="size-7 -rotate-90" strokeWidth={2.2} />
      </span>
      rebnd
      <span className="mb-3 ml-0.5 size-1 rounded-full bg-primary" />
    </a>
  )
}
