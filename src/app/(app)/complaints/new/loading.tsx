import { Skeleton } from "@/components/ui/skeleton";

export default function NewComplaintLoading() {
  return (
    <div className="mx-auto flex w-full max-w-content justify-center px-6 py-6 pb-24 md:pb-8">
      <div className="bg-surface/80 border-outline-variant/40 w-full max-w-2xl rounded-modal border p-6">
        <Skeleton className="mb-6 h-6 w-40" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="mb-4 flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
