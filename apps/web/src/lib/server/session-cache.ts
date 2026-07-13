import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthSession } from "@firmador/shared";

// Cachea el resultado de /api/auth/me en una cookie firmada para no invocar la
// lambda del API en cada navegacion. El hash del token de acceso invalida el
// cache al cambiar de usuario; el TTL acota cuanto tarda en reflejarse una
// revocacion hecha en el servidor. Sin secreto configurado, no se cachea nada.
const SECRET =
  process.env.SESSION_CACHE_SECRET ?? import.meta.env.SESSION_CACHE_SECRET ?? "";

export const SESSION_CACHE_COOKIE = "firmador_session_cache";
export const SESSION_CACHE_TTL_SECONDS = 120;

export const sessionCacheEnabled = () => SECRET.length > 0;

const sign = (data: string) =>
  createHmac("sha256", SECRET).update(data).digest("base64url");

const hashToken = (token: string) =>
  createHmac("sha256", SECRET).update(`token:${token}`).digest("base64url");

interface CachePayload {
  s: AuthSession;
  t: string;
  e: number;
}

export const encodeSessionCache = (
  session: AuthSession,
  accessToken: string,
): string => {
  const payload = Buffer.from(
    JSON.stringify({
      s: session,
      t: hashToken(accessToken),
      e: Date.now() + SESSION_CACHE_TTL_SECONDS * 1000,
    } satisfies CachePayload),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
};

export const decodeSessionCache = (
  value: string | undefined,
  accessToken: string,
): AuthSession | null => {
  if (!value) {
    return null;
  }
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as CachePayload;
    if (data.e < Date.now() || data.t !== hashToken(accessToken)) {
      return null;
    }
    return data.s;
  } catch {
    return null;
  }
};
