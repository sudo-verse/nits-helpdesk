import type { Metadata } from "next";

import { ReportForm } from "@/components/complaints/report-form";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getHostels, getServiceDepartments, getUnreadCount } from "@/lib/repositories/reference";

export const metadata: Metadata = {
  title: "Report a complaint",
  description: "Report a campus issue to the right NIT Silchar department.",
};

export default async function NewComplaintPage() {
  const user = await requireUser();
  const [departments, hostels, unreadCount] = await Promise.all([
    getServiceDepartments(),
    getHostels(),
    getUnreadCount(),
  ]);

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="Report an Issue"
      showBack
      backHref="/dashboard"
      unreadCount={unreadCount}
      contentClassName="flex justify-center"
    >
      {/* The glass form container from report_complaint. */}
      <div className="bg-surface/80 border-outline-variant/40 relative w-full max-w-2xl overflow-hidden rounded-modal border shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-md">
        <div
          aria-hidden="true"
          className="from-primary to-secondary absolute top-0 left-0 h-2 w-full bg-gradient-to-r"
        />
        <div className="p-6 md:p-12">
          <div className="mb-6">
            <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">
              Report an Issue
            </h2>
            <p className="text-body-md text-on-surface-variant">
              Please provide details about the problem you&apos;re experiencing.
            </p>
          </div>

          <ReportForm
            departments={departments}
            hostels={hostels}
            defaultHostelId={user.profile.hostel_id}
          />
        </div>
      </div>
    </AppShell>
  );
}
