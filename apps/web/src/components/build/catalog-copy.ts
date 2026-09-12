/** Who each app is for — plain words, shown in the Build modal. Falls back to a generic line. */
export const WHO_FOR: Record<string, string> = {
  "morning-briefing": "Anyone who needs to know what changed overnight in their niche — before the first coffee.",
  "competitor-crawler": "Founders and marketers who want to see a rival's pricing and features side by side with their own.",
  "content-pipeline": "People who post regularly and want one idea turned into ready drafts for each platform, in their own voice.",
  custom: "Anyone with a job they'd explain to a smart assistant in two sentences — and want done on repeat.",
};

export function whoFor(slug: string, fromDb?: string | null) {
  return fromDb?.trim() || WHO_FOR[slug] || "Anyone who wants this done for them on a schedule, without babysitting it.";
}

export const CATEGORY_LABELS: Record<string, string> = {
  research: "Research", content: "Content", sales: "Sales", marketing: "Marketing", ops: "Operations", finance: "Finance", custom: "From scratch",
};
export function categoryLabel(c: string | null | undefined) {
  if (!c) return "Other";
  return CATEGORY_LABELS[c] ?? c.charAt(0).toUpperCase() + c.slice(1);
}

/** Short reassurance shown under the consultant greeting. */
export const CONSULTANT_INTRO = "I'll ask a few quick questions, then run it once so you can see the real thing before it goes live.";
export const BRIEF_INTRO = "Fill in the blanks, then I'll run it once so you can see the real thing before it goes live.";
