import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3">
          <div className="font-title text-3xl font-semibold tracking-tight">all41</div>
          <p className="reflect text-fg-muted">AI doesn’t replace your thinking. It rewards you for thinking clearly.</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
