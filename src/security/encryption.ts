import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * AES-256-GCM encryption for secrets at rest (provider API keys, Discord bot
 * tokens). ENCRYPTION_KEY must be a 64-char hex string (32 bytes), loaded
 * from env - never hardcoded, never logged.
 */
export class SecretBox {
  private key: Buffer;

  constructor(hexKey: string) {
    if (!hexKey || hexKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('hex'), authTag.toString('hex'), ciphertext.toString('hex')].join(':');
  }

  decrypt(payload: string): string {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return plaintext.toString('utf8');
  }

  /** Masks a secret for display, e.g. sk-•••••••••••••abcd */
  static mask(secret: string, visibleTail = 4): string {
    if (secret.length <= visibleTail) return '•'.repeat(secret.length);
    const prefix = secret.slice(0, secret.startsWith('sk-') ? 3 : 0);
    return `${prefix}${'•'.repeat(Math.max(secret.length - prefix.length - visibleTail, 8))}${secret.slice(-visibleTail)}`;
  }
}
