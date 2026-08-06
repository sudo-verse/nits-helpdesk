import { Skeleton, TicketCardSkeleton } from "@/components/ui/skeleton";

export default function StaffQueueLoading() {
  return (
    <div className="mx-auto w-full max-w-content px-6 py-6 pb-24 md:pb-8">
      <Skeleton className="mb-6 h-9 w-40" />
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <TicketCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
