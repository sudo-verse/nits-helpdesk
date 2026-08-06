import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-content px-6 py-6 pb-24 md:pb-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <section className="flex flex-col gap-4 md:col-span-4 lg:col-span-3">
          <Card surface="lowest" radius="xl" className="flex flex-col items-center gap-3 p-6">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-32 rounded-xl" />
        </section>

        <section className="flex flex-col gap-4 md:col-span-8 lg:col-span-9">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
