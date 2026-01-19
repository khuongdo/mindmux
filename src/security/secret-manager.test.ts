/**
 * Tests for Secret Manager
 */

import { describe, it, expect } from 'vitest';
import { SecretManager } from './secret-manager.js';

describe('SecretManager', () => {
  const testKEK = 'a'.repeat(64); // 64-char string = 32 bytes when converted

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt plaintext', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = SecretManager.encrypt(plaintext, testKEK);

      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.nonce).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      const decrypted = SecretManager.decrypt(encrypted, testKEK);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (due to random IV)', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted1 = SecretManager.encrypt(plaintext, testKEK);
      const encrypted2 = SecretManager.encrypt(plaintext, testKEK);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.nonce).not.toBe(encrypted2.nonce);
    });

    it('should fail to decrypt with wrong KEK', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = SecretManager.encrypt(plaintext, testKEK);
      const wrongKEK = 'b'.repeat(64);

      expect(() => SecretManager.decrypt(encrypted, wrongKEK)).toThrow();
    });

    it('should fail to decrypt with corrupted ciphertext', () => {
      const encrypted = {
        ciphertext: 'corrupted-hex-data',
        nonce: 'a'.repeat(24),
        tag: 'b'.repeat(32),
        algorithm: 'aes-256-gcm' as const,
      };

      expect(() => SecretManager.decrypt(encrypted, testKEK)).toThrow();
    });
  });

  describe('validateKEK', () => {
    it('should validate strong KEK', () => {
      expect(SecretManager.validateKEK(testKEK)).toBe(true);
    });

    it('should reject short KEK', () => {
      expect(SecretManager.validateKEK('short')).toBe(false);
    });

    it('should reject empty KEK', () => {
      expect(SecretManager.validateKEK('')).toBe(false);
    });

    it('should reject non-string KEK', () => {
      expect(SecretManager.validateKEK(null as any)).toBe(false);
    });
  });

  describe('generateKEK', () => {
    it('should generate valid KEK', () => {
      const kek = SecretManager.generateKEK();
      expect(SecretManager.validateKEK(kek)).toBe(true);
    });

    it('should generate different KEKs', () => {
      const kek1 = SecretManager.generateKEK();
      const kek2 = SecretManager.generateKEK();
      expect(kek1).not.toBe(kek2);
    });
  });

  describe('rotateKey', () => {
    it('should rotate key correctly', () => {
      const plaintext = 'my-secret';
      const encrypted = SecretManager.encrypt(plaintext, testKEK);

      const newKEK = SecretManager.generateKEK();
      const rotated = SecretManager.rotateKey(encrypted, testKEK, newKEK);

      const decrypted = SecretManager.decrypt(rotated, newKEK);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail key rotation with wrong old KEK', () => {
      const encrypted = SecretManager.encrypt('secret', testKEK);
      const wrongKEK = 'c'.repeat(64);
      const newKEK = SecretManager.generateKEK();

      expect(() => SecretManager.rotateKey(encrypted, wrongKEK, newKEK)).toThrow();
    });
  });
});
