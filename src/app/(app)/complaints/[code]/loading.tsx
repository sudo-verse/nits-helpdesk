import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComplaintDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-content px-6 py-6 pb-24 md:pb-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Card radius="xl" className="flex flex-col gap-4 p-6">
            <div className="border-surface-variant flex items-center justify-between gap-4 border-b pb-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-16 w-full" />
            <div className="bg-surface-container-low mt-2 grid grid-cols-2 gap-4 rounded-lg p-4 md:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </Card>

          <Card radius="xl" className="flex flex-col gap-3 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-20 w-full" />
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card radius="xl" className="flex flex-col gap-4 p-6">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
