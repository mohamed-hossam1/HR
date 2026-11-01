export function PageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-7" role="status" aria-label="جارٍ تحميل المحتوى">
      <div className="space-y-3">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-8 w-[min(24rem,80%)] rounded-md" />
        <div className="skeleton h-4 w-[min(34rem,95%)] rounded" />
      </div>
      <div className={`grid gap-4 ${compact ? "grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
        {Array.from({ length: compact ? 4 : 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-[#dedbd4] bg-white p-5">
            <div className="skeleton h-11 w-11 rounded-lg" />
            <div className="skeleton mt-6 h-5 w-2/3 rounded" />
            <div className="skeleton mt-3 h-3 w-full rounded" />
            <div className="skeleton mt-2 h-3 w-4/5 rounded" />
          </div>
        ))}
      </div>
      <span className="sr-only">جارٍ التحميل...</span>
    </div>
  );
}
