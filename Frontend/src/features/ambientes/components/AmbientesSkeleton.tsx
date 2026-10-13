"use client";

export function AmbientesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border/60 p-5 shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center">
            <div className="h-5 w-24 bg-muted rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-6 w-36 bg-muted rounded" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-4 w-48 bg-muted rounded" />
            <div className="h-4 w-40 bg-muted rounded" />
          </div>
          <div className="h-10 w-full bg-muted rounded-lg mt-4" />
        </div>
      ))}
    </div>
  );
}
