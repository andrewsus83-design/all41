import { z } from "zod";
import { emailSchema } from "@/lib/auth/credentials";
import { PHONE_HINT, normalizePhone } from "./phone";

export const GUEST_NAME_MAX = 160;
export const TABLE_NO_MAX = 20;
export const TAG_MAX = 40;
export const TAGS_MAX = 20;

/** "VIP; Sales, finance" becomes ["VIP", "Sales", "finance"]. Case-insensitive duplicates are dropped. */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(/[,;|]/)) {
    const tag = part.trim().replace(/\s+/g, " ");
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      tags.push(tag);
    }
  }
  return tags;
}

const blankToNull = (value: unknown) => (value == null || (typeof value === "string" && value.trim() === "") ? null : value);

const phoneSchema = z.string().transform((value, ctx) => {
  const phone = normalizePhone(value);
  if (phone === null) {
    ctx.addIssue({ code: "custom", message: PHONE_HINT });
    return z.NEVER;
  }
  return phone;
});

/** One guest as the form, the import and the server action all see them. */
export const guestSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(GUEST_NAME_MAX, `Keep the name under ${GUEST_NAME_MAX} characters.`),
  email: z.preprocess(blankToNull, emailSchema.nullable()),
  phone: z.preprocess(blankToNull, phoneSchema.nullable()),
  tags: z.preprocess(
    (value) => (typeof value === "string" ? parseTags(value) : (value ?? [])),
    z
      .array(z.string().max(TAG_MAX, `Keep each tag under ${TAG_MAX} characters.`))
      .max(TAGS_MAX, `Use at most ${TAGS_MAX} tags.`),
  ),
  tableNo: z.preprocess(
    blankToNull,
    z.string().trim().max(TABLE_NO_MAX, `Keep the table under ${TABLE_NO_MAX} characters.`).nullable(),
  ),
});

export type GuestInput = z.output<typeof guestSchema>;
