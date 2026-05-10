export const SESSION_COOKIE_NAME = "trackinghub_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function sessionExpiresAt(now = new Date()) {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

export function createSessionCookie(
  token: string,
  expiresAt: Date,
  secure = process.env.NODE_ENV === "production",
) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ].join("; ");
}

export function parseSessionCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");

    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}
