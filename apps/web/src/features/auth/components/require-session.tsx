import { useEffect, type ReactNode } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"

export function RequireSession({ children }: { children: ReactNode }) {
  const { data, isPending, error, refetch } = authClient.useSession()
  useEffect(() => {
    if (!isPending && !error && !data)
      window.location.replace(
        `/auth?returnTo=${encodeURIComponent(window.location.pathname)}`
      )
  }, [data, isPending, error])
  if (error || isPending || !data)
    return (
      <main className="dashboard-theme grid min-h-dvh place-items-center bg-background p-6 text-foreground">
        <div className="max-w-md border border-border bg-card p-8">
          <h1 className="font-heading text-2xl">
            {error
              ? "Unable to check your session."
              : "Opening your workspace…"}
          </h1>
          {error && (
            <>
              <p className="my-4 text-sm text-muted-foreground">
                The API is unavailable. Please try again.
              </p>
              <Button onClick={() => void refetch()}>Try again</Button>
            </>
          )}
        </div>
      </main>
    )
  return children
}
