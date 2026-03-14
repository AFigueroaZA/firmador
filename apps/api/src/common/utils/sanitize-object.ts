const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|clave|documento|docbase64|document|pin|cert)/i;

export const sanitizeObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, currentValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? '<redacted>'
          : sanitizeObject(currentValue),
      ]),
    );
  }

  if (typeof value === 'string' && value.length > 140) {
    return `${value.slice(0, 40)}...<redacted>...${value.slice(-10)}`;
  }

  return value;
};
