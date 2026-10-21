import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/redirect";
import { AuthCard, AuthFormSkeleton } from "../auth-card";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false },
};

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Start with a free event for up to 5 guests."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-gold underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <SignUpForm searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function SignUpForm({ searchParams }: Pick<PageProps<"/signup">, "searchParams">) {
  const { next } = await searchParams;
  return <AuthForm mode="signup" next={safeNextPath(typeof next === "string" ? next : null)} />;
}
