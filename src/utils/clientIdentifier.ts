import type { Request } from 'express';
import type { ClientIdentifierType } from '../types';

export function getClientKey(
  req: Request,
  identifier: ClientIdentifierType = 'ip'
): string {
  switch (identifier) {
    case 'apiKey':
      return (
        (req.headers['x-api-key'] as string) ||
        (req.query.apiKey as string) ||
        'anonymous'
      );
    case 'userId':
      return (
        (req.headers['x-user-id'] as string) ||
        (req as Request & { user?: { id?: string } }).user?.id ||
        'anonymous'
      );
    case 'ip':
    default:
      return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        'unknown'
      );
  }
}
