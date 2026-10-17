"use client";

export function ExamenesSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 bg-slate-200 rounded-md" />
              <div className="h-4 w-24 bg-slate-200 rounded-md" />
            </div>
            <div className="h-6 w-6 rounded-full bg-slate-200" />
          </div>
          <div className="h-6 w-48 bg-slate-200 rounded-md mb-4" />
          <div className="flex items-center gap-6">
            <div className="h-4 w-36 bg-slate-200 rounded-md" />
            <div className="h-4 w-24 bg-slate-200 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
