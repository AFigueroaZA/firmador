import type { APIContext } from "astro";
import type { AuthSession } from "@firmador/shared";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  import.meta.env.API_BASE_URL ??
  "http://127.0.0.1:3000";

export const apiUrl = (path: string) => new URL(path, API_BASE_URL).toString();

export const serverFetch = (request: Request, path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  return fetch(apiUrl(path), {
    ...init,
    headers,
  });
};

export const getSession = async (request: Request): Promise<AuthSession | null> => {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes("firmador_access=")) {
    return null;
  }

  let response: Response;
  try {
    response = await serverFetch(request, "/api/auth/me");
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AuthSession;
};

export const proxyApiResponse = async (
  context: APIContext,
  path: string,
  init?: RequestInit,
) => {
  const response = await serverFetch(context.request, path, init);
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    headers: response.headers,
  });
};
