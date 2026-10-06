import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@workspace/ui/components/dialog"
import { authClient } from "@/lib/auth-client"

export function SignOutDialog() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function confirm() {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error("Sign-out failed")
      window.location.assign("/auth")
    } catch {
      setError("We couldn’t sign you out. Please try again.")
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          setOpen(next)
          setError("")
        }
      }}
    >
      <DialogTrigger
        render={
          <Button className="mt-4 w-full justify-start" variant="outline" />
        }
      >
        <LogOut className="size-3" />
        Sign out
      </DialogTrigger>
      <DialogContent
        className="dashboard-theme rounded-none border-2 border-border bg-card p-6 text-foreground"
        showCloseButton={false}
      >
        <DialogTitle className="text-2xl">Sign out of rebnd?</DialogTitle>
        <DialogDescription className="leading-6">
          You’ll need to sign in again to access your workspace. Your connected
          repositories and running jobs will stay active.
        </DialogDescription>
        {error && (
          <p role="alert" className="text-sm">
            {error}
          </p>
        )}
        <div className="mt-3 flex justify-end gap-3">
          <DialogClose render={<Button variant="outline" disabled={busy} />}>
            Cancel
          </DialogClose>
          <Button disabled={busy} onClick={() => void confirm()}>
            {busy ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
