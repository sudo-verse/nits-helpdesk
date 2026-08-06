import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OtpForm } from "@/components/auth/otp-form";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Enter your code" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  // Landing here without an address means the flow was skipped or the link was
  // shared — start over rather than showing an unusable form.
  if (!email) redirect("/login");

  return (
    <>
      <div className="mb-8 flex w-full flex-col items-center text-center">
        <span className="bg-primary-container text-on-primary-container mb-6 flex size-16 items-center justify-center rounded-full">
          <Icon name="mark_email_read" size={32} />
        </span>
        <h1 className="text-headline-lg text-on-surface mb-2">Check your email</h1>
        <p className="text-body-md text-on-surface-variant">
          We sent a 6-digit code to
          <br />
          <span className="text-on-surface font-mono">{email}</span>
        </p>
      </div>

      <OtpForm email={email} />

      <Link
        href="/login"
        className="text-body-md text-primary mt-8 hover:underline underline-offset-4"
      >
        Use a different email
      </Link>
    </>
  );
}
