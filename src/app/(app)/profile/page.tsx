import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { ProfileCard } from "@/components/profile/profile-card";
import { ProfileForm } from "@/components/profile/profile-form";
import { SignOutButton } from "@/components/profile/sign-out-button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";
import { requireUser } from "@/lib/auth/session";
import { getStatusCounts } from "@/lib/repositories/complaints";
import { getAcademicDepartments, getHostels, getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

const LINKS = [
  { href: "/faq", label: "Help & Support", icon: "help_outline" },
  { href: "/announcements", label: "Announcements", icon: "campaign" },
] as const;

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [departments, hostels, unreadCount, counts] = await Promise.all([
    getAcademicDepartments(),
    getHostels(),
    getUnreadCount(),
    getStatusCounts(supabase, { userId: user.id }),
  ]);

  const departmentName =
    departments.find((d) => d.id === user.profile.department_id)?.name ?? null;
  const pending = counts.submitted + counts.assigned + counts.under_review;

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="Profile"
      unreadCount={unreadCount}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <section className="flex flex-col gap-4 md:col-span-4 lg:col-span-3">
          <ProfileCard
            name={user.profile.name}
            email={user.email}
            rollNumber={user.profile.roll_number}
            departmentName={departmentName}
            avatarUrl={user.profile.avatar_url}
            role={user.profile.role}
          />

          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Pending" value={pending} icon="pending_actions" tone="secondary" href="/complaints?status=submitted" />
            <StatCard label="Resolved" value={counts.resolved + counts.closed} icon="task_alt" tone="success" href="/complaints?status=resolved" />
          </div>

          <Card surface="lowest" radius="xl" elevation="level1" className="flex flex-col overflow-hidden p-0">
            {LINKS.map((link, i) => (
              <div key={link.href}>
                {i > 0 && <div className="bg-outline-variant/20 h-px w-full" />}
                <Link
                  href={link.href}
                  className="hover:bg-surface-container-high/30 flex w-full items-center gap-4 p-4 text-left transition-colors"
                >
                  <Icon name={link.icon} className="text-on-surface-variant" />
                  <span className="text-title-md text-on-surface flex-1">{link.label}</span>
                  <Icon name="chevron_right" size={18} className="text-outline" />
                </Link>
              </div>
            ))}
            <div className="bg-outline-variant/20 h-px w-full" />
            <SignOutButton />
          </Card>
        </section>

        <section className="md:col-span-8 lg:col-span-9">
          <ProfileForm
            profile={user.profile}
            email={user.email}
            departments={departments}
            hostels={hostels}
          />
        </section>
      </div>
    </AppShell>
  );
}
