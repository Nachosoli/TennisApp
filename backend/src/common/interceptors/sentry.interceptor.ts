import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Only log to Sentry in production
        if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
          // Don't log 4xx errors (client errors)
          if (error instanceof HttpException) {
            const status = error.getStatus();
            if (status >= 400 && status < 500) {
              // Client errors - don't send to Sentry
              return throwError(() => error);
            }
          }

          // Log server errors (5xx) and unexpected errors
          Sentry.captureException(error, {
            tags: {
              context: context.getClass().name,
              handler: context.getHandler().name,
            },
            extra: {
              request: context.switchToHttp().getRequest(),
            },
          });
        }

        return throwError(() => error);
      }),
    );
  }
}

