import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <EmptyState
        icon="search"
        title="Not found"
        // Deliberately vague: a complaint hidden by RLS renders this same page,
        // and a more specific message would confirm that it exists.
        description="This page does not exist, or you do not have access to it."
        action={
          <ButtonLink href="/dashboard" icon="home">
            Go home
          </ButtonLink>
        }
      />
    </div>
  );
}
