/**
 * Secret Encryption Manager
 * Handles AES-256-GCM encryption/decryption of sensitive data (API keys, credentials)
 * Implements envelope encryption: DEK encrypted with KEK from environment
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export interface EncryptedSecret {
  ciphertext: string;
  nonce: string;
  tag: string;
  algorithm: string;
}

export interface DecryptionResult {
  plaintext: string;
  rotated: boolean;
}

export class SecretManager {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_SIZE = 12;
  private static readonly TAG_SIZE = 16;
  private static readonly KEY_SIZE = 32;

  /**
   * Derive Data Encryption Key from KEK
   */
  static deriveKey(kek: string, salt: string): Buffer {
    return scryptSync(kek, salt, this.KEY_SIZE);
  }

  /**
   * Encrypt plaintext with AES-256-GCM
   * Returns encrypted secret with nonce and tag, and stores salt in nonce field
   */
  static encrypt(plaintext: string, kek: string): EncryptedSecret {
    try {
      const salt = randomBytes(16).toString('hex');
      const dek = this.deriveKey(kek, salt);
      const iv = randomBytes(this.IV_SIZE);

      const cipher = createCipheriv(this.ALGORITHM, dek, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        ciphertext: encrypted,
        nonce: `${salt}:${iv.toString('hex')}`,
        tag: tag.toString('hex'),
        algorithm: this.ALGORITHM,
      };
    } catch (error) {
      throw new Error(`Secret encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt encrypted secret with AES-256-GCM
   * Extracts salt and IV from nonce field
   */
  static decrypt(encrypted: EncryptedSecret, kek: string): string {
    try {
      if (encrypted.algorithm !== this.ALGORITHM) {
        throw new Error(`Unsupported encryption algorithm: ${encrypted.algorithm}`);
      }

      const [salt, ivHex] = encrypted.nonce.split(':');
      if (!salt || !ivHex) {
        throw new Error('Invalid nonce format');
      }

      const dek = this.deriveKey(kek, salt);
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(encrypted.tag, 'hex');
      const ciphertext = Buffer.from(encrypted.ciphertext, 'hex');

      const decipher = createDecipheriv(this.ALGORITHM, dek, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(ciphertext, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Secret decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate KEK format and strength
   */
  static validateKEK(kek: string): boolean {
    if (!kek || typeof kek !== 'string') return false;
    if (kek.length < 32) return false;
    return true;
  }

  /**
   * Generate a random KEK for key rotation
   */
  static generateKEK(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Re-encrypt secret with new KEK (for key rotation)
   */
  static rotateKey(encrypted: EncryptedSecret, oldKEK: string, newKEK: string): EncryptedSecret {
    try {
      const plaintext = this.decrypt(encrypted, oldKEK);
      return this.encrypt(plaintext, newKEK);
    } catch (error) {
      throw new Error(`Key rotation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
