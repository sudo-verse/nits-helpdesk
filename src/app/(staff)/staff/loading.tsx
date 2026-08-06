import { Skeleton, StatCardSkeleton, TicketCardSkeleton } from "@/components/ui/skeleton";

export default function StaffDashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-content px-6 py-6 pb-24 md:pb-8">
      <Skeleton className="mb-2 h-9 w-56" />
      <Skeleton className="mb-6 h-5 w-72 max-w-full" />

      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <Skeleton className="mb-4 h-6 w-48" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <TicketCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
