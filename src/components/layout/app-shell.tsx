import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { SideNav } from "@/components/layout/side-nav";
import { TopAppBar } from "@/components/layout/top-app-bar";
import type { UserRole } from "@/lib/constants";
import { navForRole, secondaryNavForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * The responsive frame every signed-in screen sits inside: sidebar on desktop,
 * glass top bar plus bottom nav on mobile.
 *
 * Two Stitch screens (report_complaint, complaint_details) omit the desktop
 * sidebar — the markup even carries a comment saying so. Rendering it
 * consistently here is a deliberate correction: losing global navigation
 * halfway through a flow is a usability regression, not a design choice.
 */
export function AppShell({
  role,
  user,
  title,
  showBack = false,
  backHref,
  headerActions,
  unreadCount = 0,
  children,
  contentClassName,
}: {
  role: UserRole;
  user: { name: string | null; avatarUrl: string | null };
  title: ReactNode;
  showBack?: boolean;
  backHref?: string;
  headerActions?: ReactNode;
  unreadCount?: number;
  children: ReactNode;
  contentClassName?: string;
}) {
  const items = navForRole(role);
  const secondaryItems = secondaryNavForRole(role);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <SideNav
        items={items}
        secondaryItems={secondaryItems}
        unreadCount={unreadCount}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopAppBar
          title={title}
          showBack={showBack}
          backHref={backHref}
          user={user}
          actions={headerActions}
          mobileOnly
        />

        <main
          className={cn(
            "mx-auto w-full max-w-content flex-1 px-6 py-6",
            // Clear of the 64px fixed bottom nav on mobile.
            "pb-24 md:pb-8",
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>

      <BottomNav items={items} unreadCount={unreadCount} />
    </div>
  );
}
