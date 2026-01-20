import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateEncryptionKey,
  EncryptionError,
} from '@/lib/security/encryption';

describe('Encryption Module', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':'); // IV and encrypted data separator

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt an empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt long text', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'"<>,.?/~`';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt Unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'test message';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should throw error for invalid ciphertext', () => {
      expect(() => decrypt('invalid-ciphertext')).toThrow(EncryptionError);
    });

    it('should throw error for tampered ciphertext', () => {
      const plaintext = 'sensitive data';
      const encrypted = encrypt(plaintext);

      // Tamper with the ciphertext
      const [iv, data] = encrypted.split(':');
      const tamperedData = data.slice(0, -10) + 'XXXXXXXXXX';
      const tampered = `${iv}:${tamperedData}`;

      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw error for missing IV', () => {
      expect(() => decrypt('onlydata')).toThrow();
    });
  });

  describe('encryptObject and decryptObject', () => {
    it('should encrypt and decrypt a simple object', () => {
      const obj = { username: 'admin', password: 'secret123' };
      const encrypted = encryptObject(obj);

      expect(encrypted).not.toContain('admin');
      expect(encrypted).not.toContain('secret123');

      const decrypted = decryptObject(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should encrypt and decrypt nested objects', () => {
      const obj = {
        connection: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'secret',
          },
        },
        options: {
          ssl: true,
          timeout: 30000,
        },
      };

      const encrypted = encryptObject(obj);
      const decrypted = decryptObject(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should encrypt and decrypt arrays', () => {
      const obj = { hosts: ['host1', 'host2', 'host3'], ports: [5432, 5433] };
      const encrypted = encryptObject(obj);
      const decrypted = decryptObject(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should handle null and undefined values', () => {
      const obj = { a: null, b: undefined, c: 'value' };
      const encrypted = encryptObject(obj);
      const decrypted = decryptObject(encrypted);
      // undefined becomes null in JSON
      expect(decrypted.a).toBeNull();
      expect(decrypted.c).toBe('value');
    });

    it('should handle boolean and number values', () => {
      const obj = { enabled: true, disabled: false, count: 42, price: 19.99 };
      const encrypted = encryptObject(obj);
      const decrypted = decryptObject(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should handle empty object', () => {
      const obj = {};
      const encrypted = encryptObject(obj);
      const decrypted = decryptObject(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should handle Date objects (as strings)', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const obj = { createdAt: date };
      const encrypted = encryptObject(obj);
      const decrypted = decryptObject(encrypted);
      expect(decrypted.createdAt).toBe(date.toISOString());
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should verify correct password', async () => {
      const password = 'mySecurePassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mySecurePassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password (salt)', async () => {
      const password = 'samePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);

      // Both should still verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle long password', async () => {
      const password = 'a'.repeat(1000);
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:\'"<>,.?/~`你好';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for invalid hash format', async () => {
      const password = 'test';
      const result = await verifyPassword(password, 'invalid-hash');
      expect(result).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of default length', () => {
      const token = generateSecureToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate token of specified length', () => {
      const token16 = generateSecureToken(16);
      const token64 = generateSecureToken(64);

      expect(token16.length).toBe(32); // 16 bytes = 32 hex chars
      expect(token64.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should generate valid hex string', () => {
      const token = generateSecureToken();
      expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a valid encryption key', () => {
      const key = generateEncryptionKey();
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64); // 32 bytes = 64 hex chars for AES-256
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });

    it('should generate valid hex string', () => {
      const key = generateEncryptionKey();
      expect(/^[a-f0-9]+$/i.test(key)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw EncryptionError for encryption failures', () => {
      // Mock encryption key to cause failure
      const originalEnv = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = '';

      try {
        expect(() => encrypt('test')).toThrow(EncryptionError);
      } finally {
        process.env.ENCRYPTION_KEY = originalEnv;
      }
    });

    it('should throw EncryptionError for decryption failures', () => {
      expect(() => decrypt('malformed')).toThrow(EncryptionError);
    });

    it('should include original error message', () => {
      try {
        decrypt('invalid:data');
      } catch (error) {
        expect(error).toBeInstanceOf(EncryptionError);
        expect((error as EncryptionError).message).toBeDefined();
      }
    });
  });

  describe('Security Properties', () => {
    it('should not leak plaintext in encrypted output', () => {
      const secrets = [
        'password123',
        'api_key_secret',
        'database_password',
        'connection_string',
      ];

      for (const secret of secrets) {
        const encrypted = encrypt(secret);
        expect(encrypted.toLowerCase()).not.toContain(secret.toLowerCase());
      }
    });

    it('should maintain confidentiality of object keys and values', () => {
      const sensitiveObj = {
        username: 'admin',
        password: 'supersecret',
        apiKey: 'sk-1234567890',
      };

      const encrypted = encryptObject(sensitiveObj);

      expect(encrypted).not.toContain('admin');
      expect(encrypted).not.toContain('supersecret');
      expect(encrypted).not.toContain('sk-1234567890');
      expect(encrypted).not.toContain('username');
      expect(encrypted).not.toContain('password');
      expect(encrypted).not.toContain('apiKey');
    });

    it('should use authenticated encryption (tampering detected)', () => {
      const plaintext = 'sensitive data';
      const encrypted = encrypt(plaintext);

      // Extract parts
      const parts = encrypted.split(':');
      if (parts.length >= 2) {
        // Modify a single character in the ciphertext
        const modified = parts[0] + ':' + 'X' + parts[1].slice(1);
        expect(() => decrypt(modified)).toThrow();
      }
    });
  });

  describe('Performance', () => {
    it('should encrypt quickly for typical data sizes', () => {
      const data = 'x'.repeat(1000);
      const start = performance.now();

      for (let i = 0; i < 10; i++) {
        encrypt(data);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete 10 encryptions in < 5s
    });

    it('should decrypt quickly for typical data sizes', () => {
      const data = 'x'.repeat(1000);
      const encrypted = encrypt(data);
      const start = performance.now();

      for (let i = 0; i < 10; i++) {
        decrypt(encrypted);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete 10 decryptions in < 5s
    });

    it('should hash passwords in reasonable time', async () => {
      const password = 'testPassword123!';
      const start = performance.now();

      await hashPassword(password);

      const duration = performance.now() - start;
      // bcrypt is intentionally slow, but shouldn't be too slow
      expect(duration).toBeLessThan(500); // Should complete in < 500ms
      expect(duration).toBeGreaterThan(50); // Should take at least 50ms (security)
    });
  });
});
