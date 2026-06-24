import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { MongoError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private statusToLabel(status: number): string {
    const labels: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      413: 'Payload Too Large',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return labels[status] || 'Unknown Error';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    console.error('[ExceptionFilter]', exception instanceof Error ? exception.stack || exception.message : exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        error = this.statusToLabel(status);
      } else if (typeof res === 'object') {
        const r = res as Record<string, unknown>;
        if (Array.isArray(r.message)) {
          message = (r.message as string[]).join('; ');
        } else {
          message = (r.message as string) || message;
        }
        error = (r.error as string) || error;
      }
    } else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
      message = exception.errors
        ? Object.values(exception.errors)
            .map((e) => e.message)
            .join(', ')
        : exception.message;
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Invalid ID';
      message = `Invalid value for ${exception.path}`;
    } else if (
      exception instanceof Error &&
      'code' in exception &&
      (exception as unknown as MongoError).code === 11000
    ) {
      status = HttpStatus.CONFLICT;
      error = 'Duplicate Key';
      message = 'A resource with that value already exists';
    }

    response.status(status).json({
      success: false,
      error,
      message,
      statusCode: status,
    });
  }
}
