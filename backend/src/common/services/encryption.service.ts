import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 32 bytes for AES-256
  private readonly ivLength = 16; // 16 bytes for GCM IV
  private readonly tagLength = 16; // 16 bytes for GCM auth tag
  private readonly saltLength = 64; // Salt length for key derivation

  private getEncryptionKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;

    if (!envKey) {
      // Use a default development key if ENCRYPTION_KEY is not set
      // This should NEVER be used in production
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'ENCRYPTION_KEY environment variable is required in production',
        );
      }
      console.warn(
        '⚠️  WARNING: ENCRYPTION_KEY not set. Using default development key. DO NOT USE IN PRODUCTION!',
      );
      // Default development key (32 bytes) - DO NOT USE IN PRODUCTION
      return crypto.scryptSync(
        'courtmate-dev-key-2024',
        'salt-for-dev',
        this.keyLength,
      );
    }

    // Validate key length
    const keyBuffer = Buffer.from(envKey, 'utf8');
    if (keyBuffer.length !== this.keyLength) {
      throw new Error(
        `ENCRYPTION_KEY must be exactly ${this.keyLength} bytes (${this.keyLength * 2} hex characters). Current length: ${keyBuffer.length} bytes`,
      );
    }

    return keyBuffer;
  }

  /**
   * Encrypts sensitive data using AES-256-GCM
   * @param plaintext - The data to encrypt
   * @returns Encrypted data in format: iv:tag:encrypted (all base64 encoded)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext;
    }

    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:tag:encrypted (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypts sensitive data using AES-256-GCM
   * @param encryptedData - The encrypted data in format: iv:tag:encrypted (all base64 encoded)
   * @returns Decrypted plaintext
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) {
      return encryptedData;
    }

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivBase64, tagBase64, encrypted] = parts;
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(tagBase64, 'base64');
      const key = this.getEncryptionKey();

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
}

