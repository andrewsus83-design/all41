import "server-only";

import { connection } from "next/server";
import { z } from "zod";
import { createAnonClient } from "@/lib/supabase/anon";
import { parseWallFeed, type WallFeed } from "./records";

const slugSchema = z.string().min(3).max(40).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const keySchema = z.string().regex(/^[0-9a-f]{32}$/);

/** How many photos the big screen keeps in rotation. */
export const WALL_PHOTO_COUNT = 48;

/** The wall of an event, or null for a wrong address: unknown slug, wrong key, event not published. */
export async function getWallFeed(slug: string, key: string): Promise<WallFeed | null> {
  if (!slugSchema.safeParse(slug).success || !keySchema.safeParse(key).success) return null;
  await connection();
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("a41_wall_feed", { p_slug: slug, p_key: key, p_limit: WALL_PHOTO_COUNT });
  if (error) throw new Error(`Could not load the photo wall: ${error.message}`);
  return data ? parseWallFeed(data) : null;
}
