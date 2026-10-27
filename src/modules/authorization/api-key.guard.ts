import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env['API_KEY'];
    if (!expected) {
      throw new UnauthorizedException('API key is not configured');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.header('x-api-key') ?? '';
    const a = createHash('sha256').update(provided).digest();
    const b = createHash('sha256').update(expected).digest();
    if (!timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}