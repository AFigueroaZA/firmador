import { defineMiddleware } from "astro:middleware";
import { getSession } from "./lib/server/api";

const protectedPrefixes = ["/dashboard", "/history", "/sign"];

export const onRequest = defineMiddleware(async (context, next) => {
  const session = await getSession(context.request);
  context.locals.user = session?.user ?? null;

  const { pathname } = context.url;
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (pathname === "/") {
    return Response.redirect(
      new URL(session ? "/dashboard" : "/login", context.url),
      302,
    );
  }

  if (pathname === "/login" && session) {
    return Response.redirect(new URL("/dashboard", context.url), 302);
  }

  if (isProtected && !session) {
    return Response.redirect(new URL("/login", context.url), 302);
  }

  return next();
});

