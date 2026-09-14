import { redirect } from "next/navigation";

export const metadata = { title: "Chat" };

/** Build folded into Chat. Forward any ?app= / ?task= so old links keep working. */
export default async function BuildRedirect(props: PageProps<"/build">) {
  const sp = await props.searchParams;
  const qs = new URLSearchParams();
  if (typeof sp.app === "string") qs.set("app", sp.app);
  if (typeof sp.task === "string") qs.set("task", sp.task);
  const q = qs.toString();
  redirect(`/chat${q ? `?${q}` : ""}`);
}
