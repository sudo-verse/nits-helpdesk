"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Chip, ChipRail } from "@/components/ui/chip";
import { SearchBar } from "@/components/ui/search-bar";
import { STATUS_ORDER, STATUS_META } from "@/lib/constants";
import type { IconName } from "@/lib/icons";

type Option = { id: string; name: string; icon?: string };

/**
 * Search + filter chips for the complaints list.
 *
 * State lives in the URL so a filtered view is shareable, survives a refresh,
 * and can be read by the Server Component that does the querying — no client
 * fetch, no duplicated filter logic.
 */
export function ComplaintFilters({
  departments,
  hostels,
}: {
  departments: Option[];
  hostels: Option[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = params.get("q") ?? "";
  const [search, setSearch] = useState(currentSearch);

  // Keep the box in sync when navigation changes the URL (back button, chips).
  useEffect(() => setSearch(currentSearch), [currentSearch]);

  function update(next: Record<string, string | null>) {
    const merged = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") merged.delete(key);
      else merged.set(key, value);
    }
    // Any filter change invalidates the current page offset.
    merged.delete("page");
    startTransition(() => router.push(`/complaints?${merged.toString()}`));
  }

  // Debounce so typing does not fire a query per keystroke.
  useEffect(() => {
    if (search === currentSearch) return;
    const timer = setTimeout(() => update({ q: search || null }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const status = params.get("status");
  const department = params.get("department");
  const hostel = params.get("hostel");

  return (
    <div className="flex flex-col gap-4" data-pending={isPending || undefined}>
      <SearchBar
        placeholder="Search complaints by ID, keyword, or department…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        aria-label="Search complaints"
      />

      <ChipRail>
        <Chip selected={!status} onClick={() => update({ status: null })}>
          All
        </Chip>
        {STATUS_ORDER.map((s) => (
          <Chip
            key={s}
            selected={status === s}
            onClick={() => update({ status: status === s ? null : s })}
          >
            {STATUS_META[s].label}
          </Chip>
        ))}
      </ChipRail>

      <ChipRail>
        {departments.map((d) => (
          <Chip
            key={d.id}
            icon={d.icon as IconName | undefined}
            selected={department === d.id}
            onClick={() => update({ department: department === d.id ? null : d.id })}
          >
            {d.name}
          </Chip>
        ))}
      </ChipRail>

      {hostels.length > 0 && (
        <ChipRail>
          {hostels.map((h) => (
            <Chip
              key={h.id}
              icon="apartment"
              selected={hostel === h.id}
              onClick={() => update({ hostel: hostel === h.id ? null : h.id })}
            >
              {h.name}
            </Chip>
          ))}
        </ChipRail>
      )}
    </div>
  );
}
