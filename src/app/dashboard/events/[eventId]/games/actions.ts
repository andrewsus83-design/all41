"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWorkspace } from "@/lib/events/queries";
import { fieldErrorsOf, formObject, type FormState } from "@/lib/forms";
import { GAME_FAILURE_MESSAGES, classifyGameError, type GameFailure } from "@/lib/games/errors";
import { missionSchema, questionSchema, quizTitleSchema } from "@/lib/games/forms";
import { quizStateSchema, type QuizState } from "@/lib/games/schemas";
import { createClient } from "@/lib/supabase/server";

// Every action checks who is asking: owners write the setup (quizzes, questions,
// missions), owners and staff run a live quiz. Row level security and the
// database functions check the same token again.

const OWNER_ONLY = "Only an owner of the organization can do that.";
const isUuid = (value: string) => z.uuid().safeParse(value).success;

function describe(error: { code?: string; message?: string }): string {
  const failure: GameFailure = classifyGameError(error);
  // Only the code and message are logged: details can hold a guest's name.
  if (failure === "unknown") console.error("[a41] unexpected games error", error.code, error.message);
  return GAME_FAILURE_MESSAGES[failure];
}

async function workspaceRole() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/dashboard");
  return workspace.role;
}

const gamesPath = (eventId: string) => `/dashboard/events/${eventId}/games`;

// ------------------------------------------------------------------ quizzes

export async function createQuiz(eventId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  if (!isUuid(eventId)) return { error: "That event no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const values = formObject(formData);
  const parsed = quizTitleSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("a41_quizzes").insert({ event_id: eventId, title: parsed.data.title }).select("id").single();
  if (error) return { error: describe(error), values };

  redirect(`${gamesPath(eventId)}/quiz/${data.id}`);
}

export async function renameQuiz(eventId: string, quizId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  if (!isUuid(eventId) || !isUuid(quizId)) return { error: "That quiz no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const values = formObject(formData);
  const parsed = quizTitleSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("a41_quizzes").update({ title: parsed.data.title }).eq("id", quizId).eq("event_id", eventId).select("id");
  if (error) return { error: describe(error), values };
  if (data.length === 0) return { error: "That quiz no longer exists, or you cannot edit it.", values };

  refresh();
  return { saved: true };
}

export async function deleteQuiz(eventId: string, quizId: string): Promise<{ error?: string }> {
  if (!isUuid(eventId) || !isUuid(quizId)) return { error: "That quiz no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { error } = await supabase.from("a41_quizzes").delete().eq("id", quizId).eq("event_id", eventId);
  if (error) return { error: describe(error) };
  redirect(gamesPath(eventId));
}

/** Throws away the results of every game played with a quiz, which unlocks its questions. */
export async function clearQuizResults(eventId: string, quizId: string): Promise<{ error?: string }> {
  if (!isUuid(eventId) || !isUuid(quizId)) return { error: "That quiz no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { error } = await supabase.from("a41_quiz_sessions").delete().eq("quiz_id", quizId).eq("event_id", eventId);
  if (error) return { error: describe(error) };

  refresh();
  return {};
}

export async function saveQuestion(
  eventId: string,
  quizId: string,
  questionId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isUuid(eventId) || !isUuid(quizId) || (questionId !== null && !isUuid(questionId))) return { error: "That question no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const values = formObject(formData);
  const parsed = questionSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const question = parsed.data;

  const supabase = await createClient();
  const fields = {
    prompt: question.prompt,
    options: question.options,
    correct_index: question.correctIndex,
    time_limit_seconds: question.timeLimit,
    base_points: question.basePoints,
  };
  if (questionId === null) {
    const { error } = await supabase.from("a41_quiz_questions").insert({ quiz_id: quizId, ...fields });
    if (error) return { error: describe(error), values };
  } else {
    const { data, error } = await supabase.from("a41_quiz_questions").update(fields).eq("id", questionId).eq("quiz_id", quizId).select("id");
    if (error) return { error: describe(error), values };
    if (data.length === 0) return { error: "That question no longer exists, or you cannot edit it.", values };
  }

  refresh();
  return { saved: true };
}

export async function deleteQuestion(eventId: string, questionId: string): Promise<{ error?: string }> {
  if (!isUuid(eventId) || !isUuid(questionId)) return { error: "That question no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { error } = await supabase.from("a41_quiz_questions").delete().eq("id", questionId).eq("event_id", eventId);
  if (error) return { error: describe(error) };

  refresh();
  return {};
}

export async function moveQuestion(eventId: string, questionId: string, direction: -1 | 1): Promise<{ error?: string }> {
  if (!isUuid(eventId) || !isUuid(questionId) || (direction !== -1 && direction !== 1)) return { error: "That question no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { error } = await supabase.rpc("a41_quiz_move_question", { p_question: questionId, p_direction: direction });
  if (error) return { error: describe(error) };

  refresh();
  return {};
}

// -------------------------------------------------------------- live quiz

export type HostResult = { state: QuizState; error?: undefined } | { state?: undefined; error: string };

/** Opens the lobby for a quiz and takes the host to the big screen. Owners and staff. */
export async function openLobby(eventId: string, quizId: string): Promise<{ error: string }> {
  if (!isUuid(eventId) || !isUuid(quizId)) return { error: "That quiz no longer exists." };
  await workspaceRole();

  const supabase = await createClient();
  const { error } = await supabase.rpc("a41_quiz_open_lobby", { p_quiz: quizId });
  // A lobby that is already open is fine: the host just goes to the screen.
  if (error && classifyGameError(error) !== "session_already_live") return { error: describe(error) };
  redirect(`${gamesPath(eventId)}/quiz/host`);
}

/** Opens a lobby from the host screen itself and hands back the new state. */
export async function openLobbyHere(eventId: string, quizId: string): Promise<HostResult> {
  if (!isUuid(eventId) || !isUuid(quizId)) return { error: "That quiz no longer exists." };
  await workspaceRole();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("a41_quiz_open_lobby", { p_quiz: quizId });
  if (error) return { error: describe(error) };
  return { state: quizStateSchema.parse(data) };
}

/**
 * The host's buttons: start, reveal, next and end. Returns the new state so the
 * screen updates at once. A move that no longer fits (the quiz had moved on)
 * comes back as an error together with the current state.
 */
export async function controlQuiz(eventId: string, sessionId: string, action: "start" | "reveal" | "next" | "end", position: number | null): Promise<HostResult> {
  if (!isUuid(eventId) || !isUuid(sessionId) || !["start", "reveal", "next", "end"].includes(action)) {
    return { error: "That quiz no longer exists." };
  }
  await workspaceRole();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("a41_quiz_control", { p_session: sessionId, p_action: action, p_position: position });
  if (error) return { error: describe(error) };
  return { state: quizStateSchema.parse(data) };
}

// ------------------------------------------------------------------- hunt

export async function saveMission(eventId: string, missionId: string | null, _previous: FormState, formData: FormData): Promise<FormState> {
  if (!isUuid(eventId) || (missionId !== null && !isUuid(missionId))) return { error: "That mission no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const values = formObject(formData);
  const parsed = missionSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const mission = parsed.data;

  const supabase = await createClient();
  const fields = { title: mission.title, hint: mission.hint, points: mission.points, ...(mission.code ? { code: mission.code } : {}) };
  if (missionId === null) {
    const { error } = await supabase.from("a41_hunt_missions").insert({ event_id: eventId, ...fields });
    if (error) return { ...(classifyGameError(error) === "duplicate_code" ? { fieldErrors: { code: [GAME_FAILURE_MESSAGES.duplicate_code] } } : { error: describe(error) }), values };
  } else {
    const { data, error } = await supabase.from("a41_hunt_missions").update(fields).eq("id", missionId).eq("event_id", eventId).select("id");
    if (error) return { ...(classifyGameError(error) === "duplicate_code" ? { fieldErrors: { code: [GAME_FAILURE_MESSAGES.duplicate_code] } } : { error: describe(error) }), values };
    if (data.length === 0) return { error: "That mission no longer exists, or you cannot edit it.", values };
  }

  refresh();
  return { saved: true };
}

export async function setMissionActive(eventId: string, missionId: string, active: boolean): Promise<{ error?: string }> {
  if (!isUuid(eventId) || !isUuid(missionId)) return { error: "That mission no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { error } = await supabase.from("a41_hunt_missions").update({ active }).eq("id", missionId).eq("event_id", eventId);
  if (error) return { error: describe(error) };

  refresh();
  return {};
}

export async function deleteMission(eventId: string, missionId: string): Promise<{ error?: string }> {
  if (!isUuid(eventId) || !isUuid(missionId)) return { error: "That mission no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { error } = await supabase.from("a41_hunt_missions").delete().eq("id", missionId).eq("event_id", eventId);
  if (error) return { error: describe(error) };

  refresh();
  return {};
}

/** Clears every guest's points, for example after a rehearsal. Missions stay. */
export async function resetHuntScores(eventId: string): Promise<{ error?: string }> {
  if (!isUuid(eventId)) return { error: "That event no longer exists." };
  if ((await workspaceRole()) !== "owner") return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { error } = await supabase.from("a41_hunt_claims").delete().eq("event_id", eventId);
  if (error) return { error: describe(error) };

  refresh();
  return {};
}
