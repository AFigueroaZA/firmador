import { Agent, fetch as undiciFetch } from 'undici';
import { loadAppConfig } from '../../config/app.config';

let insecureAgent: Agent | null = null;

/**
 * fetch wrapper for provider calls. When PROVIDER_ALLOW_INSECURE_TLS is
 * enabled, requests go through undici's own fetch with an agent that skips
 * TLS certificate verification — only for these requests (some provider
 * hosts, e.g. ra.e-sign.cl, do not send the full certificate chain).
 * Node's built-in fetch cannot take an undici@8 Agent as dispatcher, so we
 * must use undici's fetch alongside its Agent. Prefer installing the
 * provider CA via NODE_EXTRA_CA_CERTS when possible.
 */
export const providerFetch = (
  url: string,
  init?: RequestInit,
): Promise<Response> => {
  if (!loadAppConfig().providerAllowInsecureTls) {
    return fetch(url, init);
  }

  insecureAgent ??= new Agent({ connect: { rejectUnauthorized: false } });
  return undiciFetch(url, {
    method: init?.method,
    headers: init?.headers as Record<string, string> | undefined,
    body: typeof init?.body === 'string' ? init.body : undefined,
    dispatcher: insecureAgent,
  }) as unknown as Promise<Response>;
};
