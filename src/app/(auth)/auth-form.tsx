"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";
import { signIn, signUp, type AuthFormState } from "./actions";

export function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: "login" | "signup";
  next: string;
  initialError?: string;
}) {
  const isLogin = mode === "login";
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(isLogin ? signIn : signUp, {
    error: initialError,
  });
  const id = useId();
  const errorId = `${id}-error`;

  if (state.notice) {
    return (
      <div role="status" className="space-y-4 rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 p-5 text-sm">
        <p>{state.notice}</p>
        <p className="text-muted">
          Already confirmed?{" "}
          <Link href="/login" className="text-gold underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <TextField
        id={`${id}-email`}
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        defaultValue={state.email}
        error={state.error}
        aria-describedby={state.error ? errorId : undefined}
      />
      <TextField
        id={`${id}-password`}
        name="password"
        type="password"
        label="Password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        required
        minLength={isLogin ? undefined : MIN_PASSWORD_LENGTH}
        error={state.error}
        aria-describedby={state.error ? errorId : undefined}
      />
      {!isLogin && <p className="-mt-2 text-sm text-muted">At least {MIN_PASSWORD_LENGTH} characters.</p>}

      <p id={errorId} role="alert" className="text-sm text-danger empty:hidden">
        {state.error}
      </p>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {isLogin ? (pending ? "Signing in…" : "Sign in") : pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
