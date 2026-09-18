import crypto from 'crypto';
import { nanoid } from 'nanoid';

/** Generates a wners_live_xxxxxxxxxxxxxxxxxxxxxxxx style raw key + its SHA-256(hashSecret) hash. */
export function generatePlatformKey(hashSecret: string): { raw: string; hashed: string; prefix: string } {
  const raw = `wners_live_${nanoid(32)}`;
  const hashed = crypto.createHmac('sha256', hashSecret).update(raw).digest('hex');
  const prefix = raw.slice(0, 16);
  return { raw, hashed, prefix };
}

export function hashPlatformKey(raw: string, hashSecret: string): string {
  return crypto.createHmac('sha256', hashSecret).update(raw).digest('hex');
}
