import { headers } from "next/headers";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getAppOriginFromEnv(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  return url ? normalizeOrigin(url) : null;
}

export function getOriginFromRequest(request: Request): string {
  const fromEnv = getAppOriginFromEnv();
  if (fromEnv) return fromEnv;
  return normalizeOrigin(new URL(request.url).origin);
}

function originFromForwardedHeaders(
  forwardedHost: string | null,
  host: string | null,
  forwardedProto: string | null,
): string | null {
  const hostname = (forwardedHost ?? host)?.split(",")[0]?.trim();
  if (!hostname) return null;
  const proto = forwardedProto?.split(",")[0]?.trim() ?? "https";
  return normalizeOrigin(`${proto}://${hostname}`);
}

export async function getAppOrigin(): Promise<string> {
  const fromEnv = getAppOriginFromEnv();
  if (fromEnv) return fromEnv;

  const h = await headers();
  const origin = h.get("origin");
  if (origin) return normalizeOrigin(origin);

  const fromHeaders = originFromForwardedHeaders(
    h.get("x-forwarded-host"),
    h.get("host"),
    h.get("x-forwarded-proto"),
  );
  if (fromHeaders) return fromHeaders;

  return "http://localhost:3000";
}
