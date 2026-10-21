import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbError } from "@/lib/db-errors";
import {
  parseDrawResult,
  parseForfeitResult,
  parseRaffleLog,
  parseRaffleSummary,
  type DrawResult,
  type ForfeitResult,
  type RaffleLogEntry,
  type RaffleSummary,
} from "./records";

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: DbError };

const failed = (error: DbError): { ok: false; error: DbError } => ({ ok: false, error });

export async function loadSummary(supabase: SupabaseClient, eventId: string): Promise<Outcome<RaffleSummary>> {
  const { data, error } = await supabase.rpc("a41_raffle_summary", { p_event: eventId });
  return error ? failed(error) : { ok: true, value: parseRaffleSummary(data) };
}

export async function loadLog(supabase: SupabaseClient, eventId: string): Promise<Outcome<RaffleLogEntry[]>> {
  const { data, error } = await supabase.rpc("a41_raffle_log", { p_event: eventId });
  return error ? failed(error) : { ok: true, value: parseRaffleLog(data) };
}

export async function drawWinner(supabase: SupabaseClient, prizeId: string): Promise<Outcome<DrawResult>> {
  const { data, error } = await supabase.rpc("a41_draw_raffle_winner", { p_prize: prizeId });
  return error ? failed(error) : { ok: true, value: parseDrawResult(data) };
}

export async function forfeitDraw(supabase: SupabaseClient, drawId: string): Promise<Outcome<ForfeitResult>> {
  const { data, error } = await supabase.rpc("a41_forfeit_raffle_draw", { p_draw: drawId });
  return error ? failed(error) : { ok: true, value: parseForfeitResult(data) };
}
