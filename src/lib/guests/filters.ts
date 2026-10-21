import { GUEST_STATUSES, type GuestStatus } from "@/lib/events/records";
import { sanitizeSearch } from "@/lib/events/search";

export const GUESTS_PER_PAGE = 50;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export interface GuestFilters {
  search: string;
  status?: GuestStatus;
  page: number;
}

/** Reads ?q=, ?status= and ?page= from the guest list address, ignoring anything that does not fit. */
export function parseGuestFilters(params: SearchParams): GuestFilters {
  const page = Number.parseInt(first(params.page) ?? "", 10);
  const status = first(params.status);
  return {
    search: sanitizeSearch(first(params.q) ?? ""),
    status: GUEST_STATUSES.find((candidate) => candidate === status),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

/** The address of a page of the guest list that keeps the search and status filter. */
export function guestsHref(base: string, filters: Pick<GuestFilters, "search" | "status">, page: number): string {
  const query = new URLSearchParams();
  if (filters.search) query.set("q", filters.search);
  if (filters.status) query.set("status", filters.status);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `${base}?${text}` : base;
}
