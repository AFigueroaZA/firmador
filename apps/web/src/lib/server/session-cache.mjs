import { createHmac, timingSafeEqual } from "node:crypto";

/** @typedef {import("@firmador/shared").AuthSession} AuthSession */

// Cachea el resultado de /api/auth/me en una cookie firmada para no invocar la
// lambda del API en cada navegacion. El hash del token de acceso invalida el
// cache al cambiar de usuario; el TTL acota cuanto tarda en reflejarse una
// revocacion hecha en el servidor. Sin secreto configurado, no se cachea nada.
const SECRET = process.env.SESSION_CACHE_SECRET ?? "";

export const SESSION_CACHE_COOKIE = "firmador_session_cache";
export const SESSION_CACHE_TTL_SECONDS = 120;

export const sessionCacheEnabled = () => SECRET.length > 0;

/** @param {string} data */
const sign = (data) =>
  createHmac("sha256", SECRET).update(data).digest("base64url");

/** @param {string} token */
const hashToken = (token) =>
  createHmac("sha256", SECRET).update(`token:${token}`).digest("base64url");

/**
 * @param {AuthSession} session
 * @param {string} accessToken
 */
export const encodeSessionCache = (session, accessToken) => {
  const payload = Buffer.from(
    JSON.stringify({
      s: session,
      t: hashToken(accessToken),
      e: Date.now() + SESSION_CACHE_TTL_SECONDS * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
};

/**
 * @param {string | undefined} value
 * @param {string} accessToken
 * @returns {AuthSession | null}
 */
export const decodeSessionCache = (value, accessToken) => {
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
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.e < Date.now() || data.t !== hashToken(accessToken)) {
      return null;
    }
    return data.s;
  } catch {
    return null;
  }
};

/**
 * @param {string[]} setCookies
 * @param {string} name
 */
export const getCookieValue = (setCookies, name) => {
  const prefix = `${name}=`;
  const cookie = setCookies.find((value) => value.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length).split(";")[0] ?? null : null;
};

/**
 * @param {AuthSession} session
 * @param {string} accessToken
 * @param {boolean} secure
 */
export const createSessionCacheCookie = (session, accessToken, secure) => {
  if (!sessionCacheEnabled()) {
    return null;
  }
  const attributes = [
    `${SESSION_CACHE_COOKIE}=${encodeSessionCache(session, accessToken)}`,
    "Path=/",
    `Max-Age=${SESSION_CACHE_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) {
    attributes.push("Secure");
  }
  return attributes.join("; ");
};

/** @param {boolean} secure */
export const clearSessionCacheCookie = (secure) => {
  const attributes = [
    `${SESSION_CACHE_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) {
    attributes.push("Secure");
  }
  return attributes.join("; ");
};
