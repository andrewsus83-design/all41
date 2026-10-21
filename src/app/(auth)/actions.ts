"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInSchema, signUpSchema } from "@/lib/auth/credentials";
import { resolveOrigin } from "@/lib/auth/origin";
import { safeNextPath } from "@/lib/auth/redirect";
import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
  /** Replaces the form once a sign-up is waiting for the email link. */
  notice?: string;
  /** Keeps what the person typed, because React clears the form after an action. */
  email?: string;
}

const RATE_LIMITED = "Too many attempts. Wait a few minutes and try again.";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email");
  const parsed = signInSchema.safeParse({ email, password: field(formData, "password") });
  if (!parsed.success) return { error: "Enter your email and password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    switch (error.code) {
      case "email_not_confirmed":
        return { error: "Confirm your email first. We sent you a link when you signed up.", email };
      case "over_request_rate_limit":
        return { error: RATE_LIMITED, email };
      default:
        return { error: "Incorrect email or password.", email };
    }
  }

  redirect(safeNextPath(field(formData, "next")));
}

export async function signUp(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email");
  const next = safeNextPath(field(formData, "next"));

  const parsed = signUpSchema.safeParse({ email, password: field(formData, "password") });
  if (!parsed.success) {
    return { error: "Enter a valid email and a password of 8 to 72 characters.", email };
  }

  const requestHeaders = await headers();
  const origin = resolveOrigin({
    host: requestHeaders.get("host"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
    forwardedProto: requestHeaders.get("x-forwarded-proto"),
    fallback: SITE_URL,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    switch (error.code) {
      case "weak_password":
        return { error: error.message, email };
      case "over_request_rate_limit":
      case "over_email_send_rate_limit":
        return { error: RATE_LIMITED, email };
      default:
        return { error: "We could not create your account. Please try again.", email };
    }
  }

  // With email confirmation switched off the account is signed in right away.
  if (data.session) redirect(next);

  return {
    email: parsed.data.email,
    notice: `We sent a confirmation link to ${parsed.data.email}. Open it to finish creating your account.`,
  };
}

export async function signOut() {
  const supabase = await createClient();
  // Local only: accounts are shared with other apps, and a global sign-out
  // would end the person's sessions there as well.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
