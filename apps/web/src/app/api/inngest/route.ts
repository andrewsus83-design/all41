import { serve } from "inngest/next";
import { inngest, functions } from "@/lib/jobs";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions });
