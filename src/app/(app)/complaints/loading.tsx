import { ComplaintCardSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function ComplaintsLoading() {
  return (
    <div className="mx-auto w-full max-w-content px-6 py-6 pb-24 md:pb-8">
      <Skeleton className="mb-6 h-9 w-56" />
      <Skeleton className="mb-4 h-12 w-full rounded-xl" />

      <div className="mb-6 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ComplaintCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
