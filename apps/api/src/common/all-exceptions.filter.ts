import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;

    const databaseDown = isDatabaseDown(exception);
    const status = databaseDown
      ? HttpStatus.SERVICE_UNAVAILABLE
      : exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!databaseDown && (!(exception instanceof HttpException) || status >= 500)) {
      const detail = exception instanceof Error ? exception.message || exception.name : 'Unexpected failure';
      this.logger.error(detail);
    }

    response.status(status).json({
      statusCode: status,
      message: databaseDown ? 'The database is not available.' : publicMessage(exception, status),
    });
  }
}

export function publicMessage(exception: unknown, status: number): string {
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: string | string[] }).message;
      const text = Array.isArray(message) ? message.join(' ') : String(message);
      if (text.trim()) return text;
    }
  }
  if (status >= 500) return 'Something went wrong. Please try again.';
  return 'The request could not be completed.';
}

function isDatabaseDown(exception: unknown): boolean {
  if (!exception || typeof exception !== 'object') return false;
  if (exception instanceof AggregateError) return exception.errors.some(isDatabaseDown);
  const code = 'code' in exception ? String((exception as { code?: unknown }).code) : '';
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND';
}
