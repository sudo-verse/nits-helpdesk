import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type Department = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color_token: string;
  description: string | null;
};

export type Hostel = { id: string; name: string; slug: string };

/**
 * Departments and hostels are read by nearly every page (filters, dropdowns,
 * chips) and change perhaps once a semester. `cache` dedupes them per request.
 */
export const getDepartments = cache(async (): Promise<Department[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, slug, icon, color_token, description")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data ?? [];
});

export const getAcademicDepartments = cache(async (): Promise<Department[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, slug, icon, color_token, description")
    .eq("is_active", true)
    .in("department_type", ["academic", "both"])
    .order("name");

  if (error || !data || data.length === 0) {
    // Fallback: if department_type filter is not set or returns empty
    const all = await getDepartments();
    const academic = all.filter((d) =>
      ["cse", "ece", "ee", "me", "ce", "eie", "physics", "chemistry", "mathematics", "management-studies", "humanities-social-sciences"].includes(d.slug),
    );
    return academic.length > 0 ? academic : all;
  }
  return data;
});

export const getServiceDepartments = cache(async (): Promise<Department[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, slug, icon, color_token, description")
    .eq("is_active", true)
    .in("department_type", ["service", "both"])
    .order("name");

  if (error || !data || data.length === 0) {
    const all = await getDepartments();
    const service = all.filter(
      (d) =>
        !["cse", "ece", "ee", "me", "ce", "eie", "physics", "chemistry", "mathematics", "management-studies", "humanities-social-sciences"].includes(d.slug),
    );
    return service.length > 0 ? service : all;
  }
  return data;
});

export const getHostels = cache(async (): Promise<Hostel[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hostels")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data ?? [];
});

/** Unread notification count — feeds the nav badge on every page. */
export const getUnreadCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
});
