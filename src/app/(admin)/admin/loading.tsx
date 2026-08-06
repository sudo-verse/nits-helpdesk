import { Skeleton, StatCardSkeleton } from "@/components/ui/skeleton";

export default function AdminOverviewLoading() {
  return (
    <div className="mx-auto w-full max-w-content px-6 py-6 pb-24 md:pb-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Skeleton className="mb-2 h-9 w-56" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="mb-6 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <Skeleton className="mb-4 h-5 w-40" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
