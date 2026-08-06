import { Skeleton } from "@/components/ui/skeleton";

export default function FaqLoading() {
  return (
    <div className="mx-auto w-full max-w-content px-6 py-6 pb-24 md:pb-8">
      <div className="mx-auto w-full max-w-3xl">
        <Skeleton className="mb-2 h-9 w-48" />
        <Skeleton className="mb-8 h-4 w-72 max-w-full" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
