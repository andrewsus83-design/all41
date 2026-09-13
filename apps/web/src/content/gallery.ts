import { coverFor } from "./covers";
import { replacesFor, APP_PAGE } from "./app-pages";

/** Serializable app shape passed to the (client) AppGallery — no server-only imports. */
export type GalleryApp = {
  slug: string;
  name: string;
  description: string;
  category: string | null;
  priceUsd: number;
  cover: string | null;
  icon: string | null;
  replaces: string | null;
  useCases: { who: string; job: string }[];
  faqs: { q: string; a: string }[];
  questions: { key: string; question: string; type: string; options?: string[]; placeholder?: string }[];
};

type SourceApp = {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  category?: string | null;
  est_credit_cost: number;
  questions?: { key: string; question: string; type: string; options?: string[]; placeholder?: string }[];
};

export function toGalleryApp(a: SourceApp): GalleryApp {
  return {
    slug: a.slug,
    name: a.name,
    description: a.description ?? "",
    category: a.category ?? null,
    priceUsd: a.est_credit_cost,
    cover: coverFor(a.slug),
    icon: a.icon,
    replaces: replacesFor(a.slug) ?? null,
    useCases: APP_PAGE[a.slug]?.useCases ?? [],
    faqs: APP_PAGE[a.slug]?.faqs ?? [],
    questions: a.questions ?? [],
  };
}
