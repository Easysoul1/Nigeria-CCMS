import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    const requestId = req?.id ?? (req?.headers?.["x-request-id"] as string | undefined);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "Unexpected error";
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse() as unknown;
      if (typeof payload === "object" && payload !== null) {
        const p = payload as Record<string, unknown>;
        code = (p.code as string) ?? (p.error as string) ?? "HTTP_ERROR";
        message = (p.message as string) ?? exception.message;
        details = p.details;
      } else {
        message = String(payload);
      }
    } else if (exception instanceof Error) {
      message = process.env.NODE_ENV === "production" ? "Unexpected error" : exception.message;
    }

    res.status(status).json({
      statusCode: status,
      code,
      message,
      details: details ?? (process.env.NODE_ENV === "production" ? undefined : undefined),
      requestId,
    });
  }
}
