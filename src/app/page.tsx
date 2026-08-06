import { redirect } from "next/navigation";

/**
 * The root is a pure router. Once auth lands (Phase 3) this reads the session
 * and sends students to /dashboard, staff to /staff and admins to /admin.
 */
export default function RootPage() {
  redirect("/login");
}
