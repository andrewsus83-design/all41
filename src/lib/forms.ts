import { z } from "zod";

/** What a Server Action hands back to its form with useActionState. */
export interface FormState {
  /** A problem with the whole form. */
  error?: string;
  /** Problems by field name. */
  fieldErrors?: Record<string, string[]>;
  /** Shown after a save that stays on the same page. */
  saved?: boolean;
  /** What the person typed, handed back because React clears a form after its action runs. */
  values?: Record<string, string>;
}

/** Groups a zod error's messages under the form field each one belongs to. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const name = String(issue.path[0] ?? "form");
    (fields[name] ??= []).push(issue.message);
  }
  return fields;
}

/** The string fields of a submitted form, without the ones React adds for Server Actions. */
export function formObject(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}
