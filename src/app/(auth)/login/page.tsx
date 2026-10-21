import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/redirect";
import { AuthCard, AuthFormSkeleton } from "../auth-card";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

const CALLBACK_ERROR =
  "That confirmation link could not be used here. If you already confirmed your email, sign in below.";

export const instant = true;

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          New to all41?{" "}
          <Link href="/signup" className="text-gold underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

/** The query string is request data, so it is read here behind the Suspense boundary. */
async function LoginForm({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      next={safeNextPath(typeof next === "string" ? next : null)}
      initialError={error === "callback" ? CALLBACK_ERROR : undefined}
    />
  );
}
