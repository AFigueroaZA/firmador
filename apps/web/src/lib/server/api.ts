import type { APIContext } from "astro";
import type { AuthSession } from "@firmador/shared";
import { resolveApiBaseUrl } from "./api-base-url.mjs";

const CONFIGURED_API_BASE_URL =
  process.env.API_BASE_URL ??
  import.meta.env.API_BASE_URL ??
  "http://127.0.0.1:3000";
const NETLIFY_RUNTIME =
  process.env.NETLIFY === "true" ||
  Boolean(process.env.DEPLOY_PRIME_URL ?? process.env.SITE_NAME);

export const apiUrl = (request: Request, path: string) =>
  new URL(
    path,
    resolveApiBaseUrl({
      requestUrl: request.url,
      configuredBaseUrl: CONFIGURED_API_BASE_URL,
      netlifyRuntime: NETLIFY_RUNTIME,
    }),
  ).toString();

export const serverFetch = (
  request: Request,
  path: string,
  init?: RequestInit,
) => {
  const headers = new Headers(init?.headers);
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  return fetch(apiUrl(request, path), {
    ...init,
    cache: init?.cache ?? "no-store",
    headers,
  });
};

export type ServerJsonResult<T> =
  | { data: T; error: null; status: number }
  | { data: null; error: string; status: number | null };

export const serverFetchJson = async <T>(
  request: Request,
  path: string,
  init?: RequestInit,
): Promise<ServerJsonResult<T>> => {
  try {
    const response = await serverFetch(request, path, init);
    if (!response.ok) {
      return {
        data: null,
        error: `La API respondió con estado ${response.status}.`,
        status: response.status,
      };
    }

    return {
      data: (await response.json()) as T,
      error: null,
      status: response.status,
    };
  } catch {
    return {
      data: null,
      error: "No fue posible conectar con la API.",
      status: null,
    };
  }
};

export const getSession = async (
  request: Request,
): Promise<AuthSession | null> => {
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
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  return new Response(body, {
    status: response.status,
    headers,
  });
};
