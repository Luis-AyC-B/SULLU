import type { ComponentProps } from "react"
import { cn } from "cn"

function Alert({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      role="alert"
      data-slot="alert"
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Alert }