import type { Metadata } from "next";
import { TryDemo } from "@/components/try/try-demo";

export const metadata: Metadata = {
  title: "Try all41",
  description: "See how it feels — brief an expert in one sentence, watch a real crew work for cents, then wake up to it done every week.",
};

/** Full-screen, webapp-feel demo — outside the (app) group so there's no auth guard. Dummy data throughout. */
export default function TryPage() {
  return <TryDemo />;
}
