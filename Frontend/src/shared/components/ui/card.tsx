import type { ComponentProps } from "react"
import { cn } from "cn"

function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      data-slot="card-header"
      className={cn("flex flex-col gap-1 px-7 pt-7 sm:px-9 sm:pt-9", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-7 pb-7 pt-6 sm:px-9 sm:pb-9", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardContent }