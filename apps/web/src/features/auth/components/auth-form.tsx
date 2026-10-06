import { useEffect, useState } from "react"
import { ArrowUpRight, GitBranch, LockKeyhole } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { authClient, authReturnPath } from "@/lib/auth-client"

export function AuthForm() {
  const { data, isPending, error: sessionError } = authClient.useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(
    new URLSearchParams(window.location.search).has("error")
      ? "GitHub sign-in did not complete. Please try again."
      : ""
  )
  useEffect(() => {
    document.title = "Sign in — rebnd"
    if (data) window.location.replace(authReturnPath())
  }, [data])
  async function signIn() {
    setBusy(true)
    setError("")
    try {
      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: new URL(authReturnPath(), window.location.origin).href,
        errorCallbackURL: `${window.location.origin}/auth?error=oauth_failed`,
      })
      if (result.error) {
        setError("GitHub sign-in is unavailable. Please try again shortly.")
        setBusy(false)
      }
    } catch {
      setError(
        "We couldn’t reach the authentication service. Please try again."
      )
      setBusy(false)
    }
  }
  return (
    <>
      <div className="mb-8">
        <p className="eyebrow mb-3 text-muted-foreground">
          Your workspace is waiting
        </p>
        <h1 className="font-heading text-[38px] font-medium tracking-[-0.04em]">
          Welcome to rebnd.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sign in with GitHub to protect your integrations. Your first sign-in
          creates your account.
        </p>
      </div>
      <Button
        className="h-12 w-full gap-3 text-xs"
        disabled={busy || isPending || Boolean(data)}
        onClick={() => void signIn()}
      >
        <GitBranch className="size-4" />
        {busy
          ? "Connecting to GitHub…"
          : isPending
            ? "Checking your session…"
            : "Continue with GitHub"}
      </Button>
      {(error || sessionError) && (
        <p
          role="alert"
          className="mt-5 border border-border p-4 text-xs leading-6"
        >
          {error ||
            "The authentication service is unavailable. Check that the API is running and try again."}
        </p>
      )}
      <div className="mt-8 flex items-start gap-3 border border-border p-4 text-xs leading-6 text-muted-foreground">
        <LockKeyhole className="mt-1 size-4 shrink-0" />
        <p>
          Sign-in uses your GitHub identity and email. Repository access is
          granted separately, for the repository you select.
        </p>
      </div>
      <div className="mt-10 border-t border-border pt-5">
        <p className="text-[11px] leading-6 text-muted-foreground">
          Want to look around first?
        </p>
        <a
          href="/demo"
          className="mt-2 inline-flex items-center gap-2 text-xs hover:underline"
        >
          Explore the demo workspace
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </>
  )
}
