/** POSTs JSON and reads the JSON answer. A 404 comes back as `missing` so callers can show the same "not found" as everywhere else. */
export async function postJson<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; missing: boolean }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) return { ok: false, missing: response.status === 404 };
  return { ok: true, data: (await response.json()) as T };
}
