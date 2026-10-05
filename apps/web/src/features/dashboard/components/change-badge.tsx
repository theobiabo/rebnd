import { StatusBadge } from "@workspace/shared/components/status-badge"
import type { ChangeStatus } from "@workspace/shared/types/integration"

export function ChangeBadge({ status }: { status: ChangeStatus }) {
  return (
    <StatusBadge
      tone={
        status === "Verified"
          ? "positive"
          : status === "Needs review" || status === "Ready"
            ? "warning"
            : status === "Blocked"
              ? "negative"
              : "neutral"
      }
    >
      {status}
    </StatusBadge>
  )
}
