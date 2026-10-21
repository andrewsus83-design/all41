import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "../(auth)/actions";

/** Who is signed in, and the way out. Reads the session, so render it inside <Suspense>. */
export async function AccountMenu() {
  const user = await requireUser();

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-56 truncate text-sm text-muted sm:block">{user.email}</span>
      <form action={signOut}>
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </div>
  );
}
