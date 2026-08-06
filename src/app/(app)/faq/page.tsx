import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Help & Support",
  description: "Answers to common questions about NITS HelpDesk.",
};

export default async function FaqPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: faqs }, unreadCount] = await Promise.all([
    supabase
      .from("faq")
      .select("id, question, answer, category")
      .eq("is_published", true)
      .order("display_order")
      .order("created_at"),
    getUnreadCount(),
  ]);

  // Grouped by category so a long list stays scannable.
  const grouped = new Map<string, typeof faqs>();
  for (const item of faqs ?? []) {
    const key = item.category ?? "General";
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="Help & Support"
      showBack
      backHref="/profile"
      unreadCount={unreadCount}
    >
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-headline-lg text-on-background mb-2 font-bold">
          Help &amp; Support
        </h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          Answers to the questions we get asked most.
        </p>

        {!faqs?.length ? (
          <EmptyState
            icon="question_answer"
            title="No answers published yet"
            description="Check back soon, or file a complaint and we'll help directly."
          />
        ) : (
          <div className="flex flex-col gap-8">
            {[...grouped.entries()].map(([category, items]) => (
              <section key={category}>
                <h2 className="text-label-sm text-outline mb-3 font-mono tracking-wider uppercase">
                  {category}
                </h2>
                <div className="flex flex-col gap-2">
                  {(items ?? []).map((faq) => (
                    <Card key={faq.id} surface="lowest" radius="xl" className="p-0">
                      {/* <details> gives keyboard and screen-reader behaviour
                          for free, and works without JavaScript. */}
                      <details className="group">
                        <summary className="text-title-md text-on-surface hover:bg-surface-container-high/30 flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-4 transition-colors">
                          {faq.question}
                          <Icon
                            name="expand_more"
                            className="text-outline shrink-0 transition-transform group-open:rotate-180"
                          />
                        </summary>
                        <p className="text-body-md text-on-surface-variant border-outline-variant/20 border-t px-4 pt-3 pb-4 whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                      </details>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
