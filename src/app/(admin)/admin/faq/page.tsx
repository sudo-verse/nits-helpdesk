import type { Metadata } from "next";

import { FaqManager, type Faq } from "@/components/admin/content-manager";
import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Manage FAQ" };

export default async function AdminFaqPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const [{ data }, unreadCount] = await Promise.all([
    supabase
      .from("faq")
      .select("id, question, answer, category, display_order, is_published")
      .order("display_order")
      .order("created_at"),
    getUnreadCount(),
  ]);

  return (
    <AppShell
      role={admin.profile.role}
      user={{ name: admin.profile.name, avatarUrl: admin.profile.avatar_url }}
      title="FAQ"
      unreadCount={unreadCount}
    >
      <div className="mb-6">
        <h1 className="text-headline-lg text-on-surface mb-2 font-bold">FAQ</h1>
        <p className="text-body-md text-on-surface-variant">
          Answers shown on the Help &amp; Support page. Lower order numbers appear first.
        </p>
      </div>

      <FaqManager faqs={(data ?? []) as Faq[]} />
    </AppShell>
  );
}
