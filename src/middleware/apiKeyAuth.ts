import { NextFunction, Request, Response } from 'express';
import { PlatformAPIKey } from '../models/PlatformAPIKey';
import { hashPlatformKey } from '../security/apiKeyIssuer';

export interface AuthedRequest extends Request {
  ownerId?: string;
}

export function apiKeyAuth(hashSecret: string) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.header('Authorization');
    const raw = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!raw) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const hashed = hashPlatformKey(raw, hashSecret);
    const keyDoc = await PlatformAPIKey.findOne({ hashedKey: hashed, revokedAt: { $exists: false } });
    if (!keyDoc) {
      return res.status(401).json({ error: 'Invalid or revoked API key' });
    }

    keyDoc.lastUsedAt = new Date();
    await keyDoc.save();

    req.ownerId = keyDoc.ownerId.toString();
    next();
  };
}
