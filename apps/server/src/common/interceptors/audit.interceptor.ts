import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { PrismaService } from "../../prisma/prisma.service";
import { redact } from "../redact/redact";
import { Reflector } from "@nestjs/core";
import { NO_AUDIT_KEY } from "../decorators/no-audit.decorator";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isNoAudit = this.reflector.getAllAndOverride<boolean>(NO_AUDIT_KEY, [context.getHandler(), context.getClass()]);
    if (isNoAudit) return next.handle();
    const req = context.switchToHttp().getRequest<{
      method: string; url: string; ip: string; headers: Record<string, string | string[] | undefined>; user?: { id?: string };
    }>();
    const write = (response: unknown) => {
      const method = req.method;
      if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return;
      const statusCodePath = (response as { statusCode?: number })?.statusCode;
      const isNoContent = statusCodePath === 204;
      const payload = isNoContent ? undefined : redact(response);
      this.prisma.auditLog
        .create({
          data: {
            userId: req.user?.id ?? null,
            action: `${method} ${req.url}`,
            entity: context.getClass().name,
            entityId: context.getHandler().name,
            newValues: payload != null ? (payload as never) : undefined,
            ipAddress: req.ip,
            userAgent: (req.headers["user-agent"] as string) ?? undefined,
            requestId: (req.headers["x-request-id"] as string) ?? undefined,
          },
        })
        .catch(() => undefined);
    };

    return next.handle().pipe(tap(write));
  }
}
