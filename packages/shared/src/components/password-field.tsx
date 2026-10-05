import { useId, useState, type ComponentProps } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export type PasswordFieldProps = Omit<ComponentProps<"input">, "type"> & {
  label?: string
}

export function PasswordField({
  label = "Password",
  id,
  className,
  disabled,
  ...props
}: PasswordFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={fieldId} className="mb-2.5 block text-xs font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={fieldId}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn(
            "h-12 w-full rounded-none border border-border bg-background px-3.5 pr-12 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-foreground disabled:opacity-50",
            className
          )}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={fieldId}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground disabled:pointer-events-none"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}
