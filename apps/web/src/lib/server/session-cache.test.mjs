import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.SESSION_CACHE_SECRET = "session-cache-test-secret";
const cache = await import(`./session-cache.mjs?test=${Date.now()}`);

const session = {
  user: {
    id: "user-1",
    email: "user@example.test",
    fullName: "User Test",
    role: "operator",
  },
};

test("a login cache cookie is signed and bound to its access token", () => {
  const cookie = cache.createSessionCacheCookie(session, "access-token", true);

  assert.match(cookie, /^firmador_session_cache=/);
  assert.match(cookie, /Max-Age=120/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);

  const value = cache.getCookieValue([cookie], cache.SESSION_CACHE_COOKIE);
  assert.deepEqual(cache.decodeSessionCache(value, "access-token"), session);
  assert.equal(cache.decodeSessionCache(value, "another-token"), null);
});

test("a modified or expired session cache is rejected", () => {
  const originalNow = Date.now;
  try {
    Date.now = () => 1_000;
    const value = cache.encodeSessionCache(session, "access-token");
    const replacement = value.endsWith("a") ? "b" : "a";
    const modified = `${value.slice(0, -1)}${replacement}`;
    assert.equal(cache.decodeSessionCache(modified, "access-token"), null);

    Date.now = () => 1_000 + cache.SESSION_CACHE_TTL_SECONDS * 1_000 + 1;
    assert.equal(cache.decodeSessionCache(value, "access-token"), null);
  } finally {
    Date.now = originalNow;
  }
});

test("logout always emits an expired cache cookie", () => {
  const cookie = cache.clearSessionCacheCookie(true);

  assert.match(cookie, /^firmador_session_cache=;/);
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
});

test("login creates and logout clears the cache cookie", async () => {
  const login = await readFile(
    new URL("../../pages/session/login.ts", import.meta.url),
    "utf8",
  );
  const logout = await readFile(
    new URL("../../pages/session/logout.ts", import.meta.url),
    "utf8",
  );

  assert.match(login, /createSessionCacheCookie/);
  assert.match(login, /headers\.append\("set-cookie", cacheCookie\)/);
  assert.match(logout, /clearSessionCacheCookie/);
  assert.match(logout, /nextHeaders\.append/);
});
