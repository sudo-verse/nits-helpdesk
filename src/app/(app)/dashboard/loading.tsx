import { ListSkeleton, StatCardSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-content px-6 py-6 pb-24 md:pb-8">
      <Skeleton className="mb-2 h-9 w-64" />
      <Skeleton className="mb-6 h-5 w-96 max-w-full" />
      <Skeleton className="mb-12 h-11 w-full sm:w-48" />

      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <Skeleton className="mb-4 h-6 w-48" />
      <ListSkeleton count={3} />
    </div>
  );
}
