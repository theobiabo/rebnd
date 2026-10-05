import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

const colors = {
  positive: "border-[#666666] bg-[#303030] text-[#e0e0e0]",
  warning: "border-dashed border-[#858585] bg-[#242424] text-[#dddddd]",
  negative: "border-[#999999] bg-[#111111] text-[#f0f0f0]",
  neutral: "border-[#505050] bg-[#242424] text-[#b5b5b5]",
} as const

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: keyof typeof colors
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] font-medium tracking-wide whitespace-nowrap uppercase",
        colors[tone]
      )}
    >
      <span className="size-1.5 bg-current" />
      {children}
    </span>
  )
}
