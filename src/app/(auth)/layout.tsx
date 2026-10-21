import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="backdrop-glow flex min-h-dvh flex-col items-center px-5 py-10 sm:py-16">
      <Logo />
      <main className="mt-10 w-full max-w-md">{children}</main>
      <Link href="/" className="mt-8 text-sm text-muted hover:text-fg">
        Back to all41.app
      </Link>
    </div>
  );
}
