import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What NITS HelpDesk collects, who can see it, and how anonymity works.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-title-lg text-on-surface mb-3 font-semibold">{title}</h2>
      <div className="text-body-md text-on-surface-variant flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1 className="text-headline-lg text-on-surface mb-2 font-bold">Privacy Policy</h1>
      <p className="text-body-md text-on-surface-variant mb-10">
        Last updated August 2026.
      </p>

      <Section title="What this is">
        <p>
          NITS HelpDesk is an independent project built by an NIT Silchar student to
          make reporting and tracking campus issues easier. It is{" "}
          <strong className="text-on-surface">not an official service</strong> of the
          NIT Silchar administration, and this policy is not issued on the
          institute&apos;s behalf.
        </p>
      </Section>

      <Section title="What we collect">
        <p>To use the app you provide, directly or via sign-in:</p>
        <ul className="list-disc pl-5">
          <li>Your institute email address (@nits.ac.in or @students.nits.ac.in)</li>
          <li>Your name, and optionally roll number, department, hostel and phone number</li>
          <li>A profile photo, if you choose to upload one</li>
          <li>
            The content of complaints you file — title, description, category, location,
            and any photos or PDFs you attach
          </li>
          <li>Comments you post on complaints, and feedback ratings you leave</li>
        </ul>
        <p>
          Signing in with Google shares whatever your Google account provides (name,
          email, avatar) at the time you connect it — this app does not request
          anything beyond that.
        </p>
      </Section>

      <Section title="Who can see your data">
        <p>The app enforces these boundaries at the database level, not just in the UI:</p>
        <ul className="list-disc pl-5">
          <li>You can always see your own complaints, comments and profile.</li>
          <li>
            Staff can see complaints assigned to them, or filed against their
            department.
          </li>
          <li>
            Admins can see every complaint, but not who filed one submitted
            anonymously — the reporter&apos;s identity is hidden from staff and admins
            at the database level, not just hidden in the interface.
          </li>
          <li>Internal staff notes on a complaint are never shown to students.</li>
        </ul>
        <p>
          <strong className="text-on-surface">On anonymity specifically:</strong>{" "}
          submitting anonymously reliably hides your identity from every other user of
          the app, including admins, through normal use of the service. It is not a
          guarantee against someone with direct database administrator access — which,
          on a small project like this, is the maintainer. That access is used for
          building and fixing the app, not for looking up reporters, but you should
          know it technically exists.
        </p>
      </Section>

      <Section title="Other services this app relies on">
        <ul className="list-disc pl-5">
          <li>
            <strong className="text-on-surface">Supabase</strong> — hosts the database,
            authentication and file storage. Everything above is stored there.
          </li>
          <li>
            <strong className="text-on-surface">Google</strong> — only if you choose
            &quot;Continue with Google&quot; to sign in.
          </li>
          <li>
            <strong className="text-on-surface">Vercel</strong> — hosts and serves the
            website itself.
          </li>
          <li>
            <strong className="text-on-surface">Sentry</strong> — may receive
            technical error reports (what broke, and where) if something goes wrong
            while you&apos;re using the app, to help fix bugs. It is configured not to
            collect personal data by default.
          </li>
        </ul>
      </Section>

      <Section title="How long data is kept">
        <p>
          Indefinitely, for now — there is no automatic deletion or scheduled purge
          yet. If you want your account or data removed, contact us (below) and we
          will handle it manually.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If what the app collects or how it&apos;s used changes meaningfully, this
          page will be updated and the date at the top will change.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or requests about your data:{" "}
          <a
            href="mailto:vaibhav2004raj@gmail.com"
            className="text-primary hover:underline"
          >
            vaibhav2004raj@gmail.com
          </a>
        </p>
      </Section>
    </>
  );
}
