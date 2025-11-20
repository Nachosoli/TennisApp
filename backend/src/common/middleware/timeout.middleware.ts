import { Injectable, NestMiddleware, RequestTimeoutException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TimeoutMiddleware implements NestMiddleware {
  private readonly timeout = 60000; // 60 seconds

  use(req: Request, res: Response, next: NextFunction) {
    // Set a timeout for the request
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          statusCode: 408,
          message: 'Request timeout. The request took too long to process.',
          error: 'Request Timeout',
        });
      }
    }, this.timeout);

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    next();
  }
}

