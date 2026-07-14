const NETLIFY_HOST_SUFFIX = ".netlify.app";

/**
 * @param {{
 *   requestUrl: string;
 *   configuredBaseUrl: string;
 *   netlifyRuntime?: boolean;
 * }} input
 */
export const resolveApiBaseUrl = ({
  requestUrl,
  configuredBaseUrl,
  netlifyRuntime = false,
}) => {
  const request = new URL(requestUrl);
  const isNetlifyRequest = request.hostname.endsWith(NETLIFY_HOST_SUFFIX);

  if (netlifyRuntime || isNetlifyRequest) {
    return request.origin;
  }

  return configuredBaseUrl;
};
