const SENSITIVE_KEYS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "csrftoken",
  "otp",
  "secret",
  "apikey",
  "authorization",
  "cookie",
  "contactinfo",
  "phonenumber",
]);

/** Keys whose value must never be persisted in the audit trail. */
function isSensitive(key: string): boolean {
  const normalised = key.replace(/[_\-\s]/g, "").toLowerCase();
  if (SENSITIVE_KEYS.has(normalised)) return true;
  return (
    normalised.endsWith("token") ||
    normalised.endsWith("tokenhash") ||
    normalised.endsWith("password") ||
    normalised.endsWith("passwordhash") ||
    normalised.endsWith("secret")
  );
}

export function redact<T>(value: T): T {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item)) as T;
  if (value instanceof Date) return value.toISOString() as T;
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = isSensitive(key) ? "[REDACTED]" : redact(item);
    }
    return output as T;
  }
  return value;
}
