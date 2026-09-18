import { SecretBox } from '../encryption';

describe('SecretBox', () => {
  const key = 'a'.repeat(64); // 64 hex chars = 32 bytes
  const box = new SecretBox(key);

  it('encrypts and decrypts a round trip', () => {
    const plaintext = 'sk-test-1234567890abcdef';
    const encrypted = box.encrypt(plaintext);
    expect(encrypted).not.toEqual(plaintext);
    expect(box.decrypt(encrypted)).toEqual(plaintext);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const a = box.encrypt('same-secret');
    const b = box.encrypt('same-secret');
    expect(a).not.toEqual(b);
  });

  it('rejects a malformed key', () => {
    expect(() => new SecretBox('too-short')).toThrow();
  });

  it('masks a secret leaving only the tail visible', () => {
    const masked = SecretBox.mask('sk-abcdefghijklmnop');
    expect(masked.endsWith('mnop')).toBe(true);
    expect(masked).not.toContain('efgh');
  });
});
