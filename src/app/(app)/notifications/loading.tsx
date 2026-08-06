import { Skeleton } from "@/components/ui/skeleton";

function NotificationRowSkeleton() {
  return (
    <div className="bg-surface-container-lowest border-outline-variant/20 flex gap-4 rounded-xl border p-4">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
        <Skeleton className="h-3 w-full max-w-sm" />
      </div>
    </div>
  );
}

export default function NotificationsLoading() {
  return (
    <div className="mx-auto w-full max-w-content px-6 py-6 pb-24 md:pb-8">
      <Skeleton className="mb-6 h-9 w-40" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <NotificationRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
