import { Inngest } from "inngest";

/**
 * Inngest client (Tasks 2.9 / 3.3 / 4.4). Event key + signing key come from INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY.
 * Dev mode (unsigned, local Dev Server) is enabled ONLY outside production when no signing key is configured —
 * never in production, so a missing key there fails closed instead of accepting unsigned requests.
 */
const isDev = process.env.NODE_ENV !== "production" && !process.env.INNGEST_SIGNING_KEY;

export const inngest = new Inngest({ id: "all41", isDev });

export type GraphNodeIngested = { user_id: string; source_type: string; source_id: string };
