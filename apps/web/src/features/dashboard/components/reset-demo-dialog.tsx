import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

export function ResetDemoDialog({
  open,
  onOpenChange,
  onReset,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  onReset: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-theme border-2 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            Reset the example workspace?
          </DialogTitle>
          <DialogDescription className="leading-6">
            This clears local demo actions and restores the original synthetic
            examples and preferences. No external repository or account is
            affected.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep changes
          </Button>
          <Button
            onClick={() => {
              onReset()
              onOpenChange(false)
            }}
          >
            Reset example workspace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
