const API_BASE_URL = process.env.API_BASE_URL ?? undefined                             ?? "http://127.0.0.1:3000";
const apiUrl = (path) => new URL(path, API_BASE_URL).toString();
const serverFetch = (request, path, init) => {
  const headers = new Headers(init?.headers);
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return fetch(apiUrl(path), {
    ...init,
    headers
  });
};
const getSession = async (request) => {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes("firmador_access=")) {
    return null;
  }
  let response;
  try {
    response = await serverFetch(request, "/api/auth/me");
  } catch {
    return null;
  }
  if (!response.ok) {
    return null;
  }
  return await response.json();
};
const proxyApiResponse = async (context, path, init) => {
  const response = await serverFetch(context.request, path, init);
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    headers: response.headers
  });
};

export { apiUrl as a, getSession as g, proxyApiResponse as p, serverFetch as s };
