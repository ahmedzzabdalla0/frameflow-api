import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

interface NormalizedErrorBody {
  ok: false;
  statusCode: number;
  error: string;
  path: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const statusCode = this.resolveStatusCode(exception);
    const message = this.resolveMessage(exception);

    const body: NormalizedErrorBody = {
      ok: false,
      statusCode,
      error: message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${statusCode}`, (exception as Error)?.stack);
    }

    response.status(statusCode).json(body);
  }

  private resolveStatusCode(exception: unknown): HttpStatus {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const rawMessage = (response as { message: string | string[] }).message;
        return Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
      }
      return exception.message;
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Internal server error';
  }
}
