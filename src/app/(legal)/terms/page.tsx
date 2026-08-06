import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using NITS HelpDesk.",
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

export default function TermsOfServicePage() {
  return (
    <>
      <h1 className="text-headline-lg text-on-surface mb-2 font-bold">
        Terms of Service
      </h1>
      <p className="text-body-md text-on-surface-variant mb-10">
        Last updated August 2026.
      </p>

      <Section title="1. What this is">
        <p>
          NITS HelpDesk is an independent, student-built tool for reporting and
          tracking campus issues at NIT Silchar. It is{" "}
          <strong className="text-on-surface">not an official service</strong> of the
          NIT Silchar administration, run without institutional backing, and provided
          free of charge on a best-effort basis. By using it, you agree to these
          terms.
        </p>
      </Section>

      <Section title="2. Who can use it">
        <p>
          Access is restricted to holders of a valid NIT Silchar institute email
          address (@nits.ac.in or @students.nits.ac.in). Signing up with any other
          address is not permitted and is blocked at the database level, not just in
          the interface.
        </p>
      </Section>

      <Section title="3. Your account">
        <p>
          You&apos;re responsible for the accuracy of the information on your profile
          and for anything done through your account. Don&apos;t share your sign-in
          credentials with anyone else.
        </p>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5">
          <li>File false, malicious, or deliberately misleading complaints</li>
          <li>Use anonymous reporting to harass, defame, or falsely accuse anyone</li>
          <li>
            Attempt to bypass rate limits, access controls, or another
            user&apos;s data
          </li>
          <li>Upload content you don&apos;t have the right to share</li>
        </ul>
        <p>
          Rate limits apply to signing in, filing complaints, and posting comments to
          keep the service usable for everyone. Accounts that misuse the service may
          be disabled by an administrator.
        </p>
      </Section>

      <Section title="5. Anonymous reporting">
        <p>
          Marking a complaint anonymous hides your identity from staff and admins
          through normal use of the app — see the{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>{" "}
          for exactly what that guarantee does and doesn&apos;t cover. Anonymity, once
          set on submission, cannot be changed afterward by anyone, including you.
        </p>
      </Section>

      <Section title="6. Your content">
        <p>
          You keep ownership of what you submit — complaint text, comments, photos and
          attachments. By submitting it, you allow the app to store, process, and
          display it to the people your role and the complaint&apos;s settings entitle
          to see it, for as long as your account or the complaint exists.
        </p>
      </Section>

      <Section title="7. No warranty">
        <p>
          This is a small, unfunded student project, not a commercial product. It is
          provided &quot;as is&quot;, without any guarantee of uptime, accuracy, or
          that a complaint will be resolved within any particular time. Don&apos;t rely
          on it as the only channel for anything urgent or safety-critical — use the
          institute&apos;s official emergency channels for that.
        </p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          To the extent the law allows, the maintainer of this project is not liable
          for any loss or damage arising from your use of, or inability to use, the
          app — including lost data, missed deadlines, or complaints that go
          unresolved. This is a plain-language best-effort disclaimer appropriate to a
          free, non-commercial student project, not a substitute for formal legal
          advice.
        </p>
      </Section>

      <Section title="9. Ending access">
        <p>
          You can stop using the app at any time. An administrator may disable an
          account that violates these terms. Contact us if you believe an account was
          disabled in error.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>These terms are governed by the laws of India.</p>
      </Section>

      <Section title="11. Changes">
        <p>
          These terms may change as the app changes. Continuing to use the app after a
          change means you accept the updated terms; the date at the top of this page
          reflects the latest revision.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Questions about these terms:{" "}
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
