import type { Metadata } from "next";

import { ComplaintCard } from "@/components/complaints/complaint-card";
import { ComplaintRow } from "@/components/complaints/complaint-row";
import { StatusTimeline } from "@/components/complaints/status-timeline";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Avatar } from "@/components/ui/avatar";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip, ChipRail, RadioChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { SearchBar } from "@/components/ui/search-bar";
import {
  ComplaintCardSkeleton,
  ComplaintRowSkeleton,
  StatCardSkeleton,
} from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { STATUS_ORDER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Components",
  robots: { index: false, follow: false },
};

function Section({
  title,
  source,
  children,
}: {
  title: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="border-outline-variant/30 flex flex-wrap items-baseline justify-between gap-2 border-b pb-1">
        <h2 className="text-title-md font-semibold">{title}</h2>
        <span className="text-label-sm text-outline font-mono">{source}</span>
      </div>
      {children}
    </section>
  );
}

const HISTORY = [
  { status: "submitted" as const, createdAt: "2026-08-01T09:15:00Z", actorName: "Student Portal" },
  { status: "assigned" as const, createdAt: "2026-08-01T09:45:00Z", note: "Routed to IT Infra" },
  { status: "under_review" as const, createdAt: "2026-08-01T10:30:00Z", actorName: "R. Kumar" },
  { status: "in_progress" as const, createdAt: "2026-08-01T11:00:00Z", note: "Replacing faulty switch" },
];

export default function ComponentsPage() {
  return (
    <main className="mx-auto flex max-w-content flex-col gap-12 px-6 py-6">
      <header>
        <h1 className="text-headline-lg text-primary font-bold">Components</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Every reusable piece, with the Stitch screen it was taken from. Compare
          against <code className="font-mono">design/&lt;screen&gt;/screen.png</code>.
        </p>
      </header>

      <Section title="Buttons" source="DESIGN.md · Components > Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon="add_circle">Report Complaint</Button>
          <Button variant="secondary" icon="filter_list">Filter</Button>
          <Button variant="tertiary">Mark all as read</Button>
          <Button variant="outline" icon="school">Continue with Institute Email</Button>
          <Button variant="ghost" icon="settings">Settings</Button>
          <Button variant="destructive" icon="warning">Escalate Issue</Button>
          <Button size="icon" icon="more_vert" aria-label="More" variant="ghost" />
          <Button isLoading>Submitting</Button>
          <Button disabled icon="send">Disabled</Button>
          <ButtonLink href="#" variant="secondary" icon="open_in_new">Link button</ButtonLink>
        </div>
        <Button variant="cta" trailingIcon="send">Submit Complaint</Button>
      </Section>

      <Section title="Status & priority badges" source="complaint_history · admin_dashboard">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_ORDER.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority="low" />
          <PriorityBadge priority="medium" />
          <PriorityBadge priority="high" />
          <Badge tone="neutral" icon="domain">IT Infrastructure</Badge>
          <Badge tone="primary" outlined>CMP-2026-00001</Badge>
        </div>
      </Section>

      <Section title="Chips" source="home_dashboard · complaint_history">
        <ChipRail bleed={false}>
          <Chip selected icon="apartment">Hostel</Chip>
          <Chip icon="bolt">Electrical</Chip>
          <Chip icon="wifi">WiFi</Chip>
          <Chip icon="school">Academics</Chip>
          <Chip icon="water_drop">Water Supply</Chip>
        </ChipRail>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="text-label-sm text-on-surface-variant mb-2 font-mono uppercase">
            Priority
          </legend>
          <RadioChip name="sg-priority" value="low" tone="secondary" defaultChecked>Low</RadioChip>
          <RadioChip name="sg-priority" value="medium" tone="primary">Medium</RadioChip>
          <RadioChip name="sg-priority" value="high" tone="error">High</RadioChip>
        </fieldset>
      </Section>

      <Section title="Form controls" source="report_complaint">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title" required>
            <Input placeholder="Brief summary of the issue" />
          </Field>
          <Field label="Location">
            <Input icon="location_on" placeholder="e.g. Hostel 8, Room 204" />
          </Field>
          <Field label="Department" required>
            <Select defaultValue="">
              <option value="" disabled>Select Department</option>
              <option value="wifi">Internet/WiFi</option>
              <option value="hostel">Hostel</option>
            </Select>
          </Field>
          <Field label="Roll number" error="Roll number must be 3–20 characters.">
            <Input defaultValue="X" />
          </Field>
          <Field label="Description" hint="Minimum 10 characters." className="md:col-span-2">
            <Textarea placeholder="Provide detailed information about the issue…" />
          </Field>
        </div>
        <Switch
          label="Submit Anonymously"
          description="Hide identity from resolving staff"
        />
      </Section>

      <Section title="Search" source="complaint_history · task_management">
        <SearchBar placeholder="Search complaints by ID, keyword, or department…" />
      </Section>

      <Section title="Tabs" source="task_management">
        <Tabs
          activeHref="#unassigned"
          items={[
            { href: "#unassigned", label: "Unassigned", count: 12 },
            { href: "#active", label: "Active" },
            { href: "#escalated", label: "Escalated" },
            { href: "#resolved", label: "Resolved" },
          ]}
        />
      </Section>

      <Section title="Stat tiles" source="home_dashboard">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total" value={12} icon="folder_open" tone="primary" />
          <StatCard label="Pending" value={3} icon="hourglass_empty" tone="error" />
          <StatCard label="In Progress" value={2} icon="sync" tone="secondary" />
          <StatCard label="Resolved" value={7} icon="check_circle" tone="success" />
        </div>
      </Section>

      <Section title="Complaint rows" source="home_dashboard">
        <div className="flex flex-col gap-2">
          <ComplaintRow
            code="CMP-2026-04092" title="Hostel 9 WiFi Down" status="submitted"
            icon="wifi_off" createdAt="2026-08-06T08:00:00Z"
          />
          <ComplaintRow
            code="CMP-2026-04088" title="Leaking tap in washroom" status="in_progress"
            icon="plumbing" createdAt="2026-08-05T09:00:00Z"
          />
          <ComplaintRow
            code="CMP-2026-04010" title="Corridor light replacement" status="resolved"
            icon="lightbulb" createdAt="2026-08-03T09:00:00Z"
          />
        </div>
      </Section>

      <Section title="Complaint cards" source="complaint_history">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ComplaintCard
            code="CMP-2026-00089" title="Hostel 9 WiFi Router Down" status="submitted"
            departmentName="Internet/WiFi" departmentIcon="wifi" createdAt="2026-08-04T10:00:00Z"
          />
          <ComplaintCard
            code="CMP-2026-00087" title="Leaking tap in Aryabhatta Washroom" status="in_progress"
            departmentName="Water Supply" departmentIcon="water_drop" createdAt="2026-08-03T10:00:00Z"
          />
          <ComplaintCard
            code="CMP-2026-00082" title="Library AC Malfunction (Reading Room 2)" status="resolved"
            departmentName="Electrical" departmentIcon="bolt" createdAt="2026-07-30T10:00:00Z"
          />
        </div>
      </Section>

      <Section title="Timeline" source="complaint_details">
        <Card className="max-w-md p-6">
          <CardTitle className="mb-6">Resolution Progress</CardTitle>
          <StatusTimeline history={HISTORY} currentStatus="in_progress" />
        </Card>
      </Section>

      <Section title="Notifications" source="notifications_profile">
        <div className="flex flex-col gap-2">
          <NotificationItem
            type="resolution" title="Ticket Resolved: Hostel Wi-Fi Issue"
            body="Your complaint regarding the intermittent Wi-Fi connection in Hostel 9 has been marked as resolved."
            createdAt="2026-08-06T11:58:00Z" isRead={false}
          />
          <NotificationItem
            type="announcement" title="System Maintenance"
            body="The academic portal will be down for scheduled maintenance tonight from 11:00 PM to 2:00 AM IST."
            createdAt="2026-08-06T11:00:00Z" isRead={false}
          />
          <NotificationItem
            type="comment" title="New comment on CMP-2026-04029"
            body="Admin replied: We have noted the request for additional library hours."
            createdAt="2026-08-05T10:00:00Z" isRead
          />
        </div>
      </Section>

      <Section title="Cards & avatars" source="complaint_details · notifications_profile">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>
              <Avatar name="Rahul Sharma" size={32} />
              Rahul Sharma
            </CardTitle>
            <Badge tone="primary">B.Tech · CSE</Badge>
          </CardHeader>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Avatar name="Rahul Sharma" size={24} />
            <Avatar name="R Kumar" size={32} />
            <Avatar name="Devashish Nath" size={40} />
            <Avatar name={null} size={48} />
            <Avatar name="Anonymous" size={64} />
          </div>
        </Card>
      </Section>

      <Section title="Loading skeletons" source="—">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ComplaintRowSkeleton />
        <div className="grid gap-4 md:grid-cols-2">
          <ComplaintCardSkeleton />
        </div>
      </Section>

      <Section title="Empty state" source="—">
        <Card className="p-0">
          <EmptyState
            icon="inbox"
            title="No complaints yet"
            description="When you report an issue it will appear here so you can track it."
            action={<Button icon="add_circle">Report Complaint</Button>}
          />
        </Card>
      </Section>
    </main>
  );
}
