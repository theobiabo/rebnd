import { cn } from "@workspace/ui/lib/utils"
import LogoIconComponent from "./svgs/logo_icon"

type BrandProps = {
  small?: boolean
  className?: string
}

export function Brand({ small = false, className }: BrandProps) {
  return (
    <a
      href="/"
      aria-label="rebnd home"
      className={cn(
        "inline-flex min-h-11 w-fit shrink-0 items-center gap-2.5 font-heading font-medium tracking-[-0.06em] outline-offset-4 focus-visible:outline-2 focus-visible:outline-foreground",
        small ? "text-2xl" : "text-[29px]",
        className
      )}
    >
      <LogoIconComponent
        aria-hidden="true"
        focusable="false"
        className={cn("block w-auto shrink-0", small ? "h-6" : "h-8")}
      />
      <span>rebnd</span>
    </a>
  )
}
