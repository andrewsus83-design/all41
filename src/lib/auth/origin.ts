const HOST_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i;

interface OriginInput {
  host: string | null;
  forwardedHost: string | null;
  forwardedProto: string | null;
  /** Used when the request carries no usable host. */
  fallback: string;
}

const first = (value: string | null) => value?.split(",", 1)[0].trim() || null;

/** The public origin a request came in on, for links we put in emails. */
export function resolveOrigin({ host, forwardedHost, forwardedProto, fallback }: OriginInput): string {
  const hostname = first(forwardedHost) ?? first(host);
  if (!hostname || !HOST_PATTERN.test(hostname)) return new URL(fallback).origin;

  const isLocal = hostname === "localhost" || hostname.startsWith("localhost:") || hostname.startsWith("127.0.0.1");
  const proto = first(forwardedProto) === "http" || (isLocal && !forwardedProto) ? "http" : "https";
  return `${proto}://${hostname}`;
}
