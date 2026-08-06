import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <Skeleton className="mb-2 h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="bg-surface-container-lowest flex flex-col gap-6 rounded-2xl p-6">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
