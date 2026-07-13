import { defineMiddleware } from "astro:middleware";
import { getSession } from "./lib/server/api";
import {
  SESSION_CACHE_COOKIE,
  SESSION_CACHE_TTL_SECONDS,
  decodeSessionCache,
  encodeSessionCache,
  sessionCacheEnabled,
} from "./lib/server/session-cache";

const protectedPrefixes = [
  "/dashboard",
  "/history",
  "/identity",
  "/sign",
  "/enrollment",
];

export const onRequest = defineMiddleware(async (context, next) => {
  const accessToken = context.cookies.get("firmador_access")?.value;
  const cached =
    accessToken && sessionCacheEnabled()
      ? decodeSessionCache(
          context.cookies.get(SESSION_CACHE_COOKIE)?.value,
          accessToken,
        )
      : null;
  const session = cached ?? (await getSession(context.request));
  context.locals.user = session?.user ?? null;

  if (accessToken && sessionCacheEnabled() && !cached && session) {
    context.cookies.set(
      SESSION_CACHE_COOKIE,
      encodeSessionCache(session, accessToken),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: import.meta.env.PROD,
        path: "/",
        maxAge: SESSION_CACHE_TTL_SECONDS,
      },
    );
  }

  const { pathname } = context.url;
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (pathname === "/" && session) {
    return Response.redirect(new URL("/dashboard", context.url), 302);
  }

  if (pathname === "/login" && session) {
    return Response.redirect(new URL("/dashboard", context.url), 302);
  }

  if (isProtected && !session) {
    return Response.redirect(new URL("/login", context.url), 302);
  }

  return next();
});
