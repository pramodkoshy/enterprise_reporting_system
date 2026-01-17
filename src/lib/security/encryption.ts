import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    // For development, use a default key (DO NOT use in production)
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', KEY_LENGTH);
  }

  // If the key is a hex string, convert it
  if (/^[0-9a-fA-F]+$/.test(encryptionKey)) {
    return Buffer.from(encryptionKey, 'hex');
  }

  // Otherwise, derive a key from the string
  return crypto.scryptSync(encryptionKey, 'salt', KEY_LENGTH);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + AuthTag + Encrypted data
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();

  // Extract IV, AuthTag, and encrypted data
  const iv = Buffer.from(ciphertext.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(ciphertext.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
  const encrypted = ciphertext.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}
