import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const BCRYPT_ROUNDS = 10;

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

function getKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length === 0) {
    throw new EncryptionError('ENCRYPTION_KEY environment variable is not set');
  }

  // If the key is a hex string of correct length, convert it directly
  if (/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    return Buffer.from(encryptionKey, 'hex');
  }

  // Otherwise, derive a key from the string
  return crypto.scryptSync(encryptionKey, 'encryption-salt', KEY_LENGTH);
}

export function encrypt(plaintext: string): string {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new EncryptionError(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function decrypt(ciphertext: string): string {
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new EncryptionError('Invalid ciphertext format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const key = getKey();

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function encryptObject(obj: Record<string, unknown>): string {
  return encrypt(JSON.stringify(obj));
}

export function decryptObject<T = Record<string, unknown>>(ciphertext: string): T {
  const decrypted = decrypt(ciphertext);
  return JSON.parse(decrypted) as T;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
