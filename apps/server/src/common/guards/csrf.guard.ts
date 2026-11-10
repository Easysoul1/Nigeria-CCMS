import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

/**
 * Double-submit CSRF protection.
 *
 * Only cookie-authenticated mutations are checked. Bearer-only requests are
 * CORS-controlled and cannot be forged by a cross-site form.
 *
 * The credential-issuing endpoints are exempt: they are either unauthenticated
 * (login, forgot/reset password) or rely on the httpOnly SameSite=Lax refresh
 * cookie (refresh). Without the exemption a stale access-token cookie would
 * make it impossible to sign in again.
 */
const EXEMPT_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/logout-all",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/register-lawyer",
  "/auth/csrf",
];

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: string[] = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{
        method: string;
        cookies?: Record<string, string | undefined>;
        headers: Record<string, string | string[] | undefined>;
        originalUrl?: string;
        url?: string;
      }>();

    if (["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) return true;

    const path = (req.originalUrl ?? req.url ?? "").split("?")[0] ?? "";
    if (path.startsWith("/api/")) {
      const suffix = path.replace(/^\/api\/v\d+/, "");
      if (EXEMPT_PATHS.some((exempt) => suffix === exempt)) return true;
    } else if (EXEMPT_PATHS.some((exempt) => path === exempt)) {
      return true;
    }

    const hasCookieAuth = Boolean(req.cookies?.access_token);
    if (!hasCookieAuth) return true;

    const origin = (req.headers.origin as string | undefined) ?? (req.headers.referer as string | undefined);
    const originOk = Boolean(origin) && this.allowedOrigins.some((allowed) => origin?.startsWith(allowed));
    if (!originOk) {
      throw new ForbiddenException({ statusCode: 403, code: "CSRF_ORIGIN", message: "Blocked by origin policy" });
    }

    const cookie = req.cookies?.csrf_token;
    const headerValue = req.headers["x-csrf-token"];
    const header = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!cookie || cookie !== header) {
      throw new ForbiddenException({ statusCode: 403, code: "CSRF_TOKEN", message: "Invalid CSRF token" });
    }
    return true;
  }
}
