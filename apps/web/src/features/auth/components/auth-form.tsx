import { useEffect, useState, type FormEvent } from "react"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  GitBranch,
  Info,
  LockKeyhole,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PasswordField } from "@workspace/shared/components/password-field"

export type AuthMode = "signin" | "signup" | "reset"

export function AuthForm() {
  const initialMode = new URLSearchParams(window.location.search).get("mode")
  const [mode, setMode] = useState<AuthMode>(
    initialMode === "signup" || initialMode === "reset" ? initialMode : "signin"
  )
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [notice, setNotice] = useState("")
  useEffect(() => {
    document.title = `${mode === "signup" ? "Create account" : mode === "reset" ? "Reset password" : "Sign in"} — rebnd`
  }, [mode])
  const changeMode = (next: AuthMode) => {
    setMode(next)
    setPassword("")
    setNotice("")
    const url = new URL(window.location.href)
    if (next === "signin") url.searchParams.delete("mode")
    else url.searchParams.set("mode", next)
    window.history.replaceState(null, "", url)
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPassword("")
    setNotice(
      mode === "reset"
        ? "Password reset is not available in this preview. No email has been sent."
        : mode === "signup"
          ? "Account creation is not available in this preview. Your details have not been saved or sent."
          : "Sign-in is not available in this preview. Your details have not been saved or sent."
    )
  }
  return (
    <>
      <div className="mb-8">
        <p className="eyebrow mb-3 text-muted-foreground">
          {mode === "signup"
            ? "Your first connection"
            : mode === "reset"
              ? "Account recovery"
              : "Your workspace is waiting"}
        </p>
        <h1 className="font-heading text-[38px] font-medium tracking-[-0.04em]">
          {mode === "signup"
            ? "Build with confidence."
            : mode === "reset"
              ? "Reset your password."
              : "Welcome back."}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {mode === "signup"
            ? "One integration. Clear boundaries. Get started with rebnd."
            : mode === "reset"
              ? "Enter the email address associated with your workspace."
              : "Sign in to keep your integrations moving forward."}
        </p>
      </div>
      {mode !== "reset" && (
        <>
          <Button
            variant="outline"
            className="h-12 w-full gap-3 border border-border bg-background text-xs"
            onClick={() =>
              setNotice(
                "GitHub sign-in is not connected in this preview. You can explore the demo workspace below."
              )
            }
          >
            <GitBranch className="size-4" />
            Continue with GitHub
          </Button>
          <div className="my-7 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[9px] text-muted-foreground">
              OR CONTINUE WITH EMAIL
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label
            htmlFor="auth-email"
            className="mb-2.5 block text-xs font-medium"
          >
            Email address
          </label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="h-12 w-full rounded-none border border-border bg-background px-3.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-foreground"
          />
        </div>
        {mode !== "reset" && (
          <div>
            <PasswordField
              key={mode}
              id="auth-password"
              name="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              minLength={mode === "signup" ? 8 : undefined}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                mode === "signup"
                  ? "At least 8 characters"
                  : "Enter your password"
              }
            />
            {mode === "signin" && (
              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={() => changeMode("reset")}
                  className="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
        )}
        <Button
          type="submit"
          className="h-12 w-full justify-between px-4 text-xs"
        >
          {mode === "signup"
            ? "Create account"
            : mode === "reset"
              ? "Request reset link"
              : "Sign in"}
          <ArrowRight className="size-4" />
        </Button>
      </form>
      {notice && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2.5 border border-border bg-background p-3.5 text-xs leading-6"
        >
          <Info className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
          <p>{notice}</p>
        </div>
      )}
      <div className="mt-6 text-center text-xs text-muted-foreground">
        {mode === "reset" ? (
          <button
            onClick={() => changeMode("signin")}
            className="inline-flex items-center gap-2 text-foreground"
          >
            <ArrowLeft className="size-3" />
            Back to sign in
          </button>
        ) : (
          <>
            {mode === "signup" ? "Already have an account?" : "New to rebnd?"}
            <button
              onClick={() =>
                changeMode(mode === "signup" ? "signin" : "signup")
              }
              className="ml-2 font-medium text-foreground underline underline-offset-4"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </>
        )}
      </div>
      <div className="mt-10 border-t border-border pt-5">
        <div className="flex items-start gap-2 text-[10px] leading-5 text-muted-foreground">
          <LockKeyhole className="mt-1 size-3 shrink-0" />
          <p>
            Interface preview. Authentication is not connected.
            <br />
            No credentials are saved or sent.
          </p>
        </div>
        <a
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-2 text-xs text-foreground hover:underline"
        >
          Explore the demo workspace
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </>
  )
}
