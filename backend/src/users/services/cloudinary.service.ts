import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.isConfigured = !!(cloudName && apiKey && apiSecret);

    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log('Cloudinary configured successfully');
    } else {
      this.logger.warn('Cloudinary not configured - photo uploads will be disabled');
    }
  }

  /**
   * Upload image buffer to Cloudinary
   */
  async uploadImage(
    buffer: Buffer,
    folder: string = 'courtmate',
    publicId?: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!this.isConfigured) {
      // Return a data URL placeholder instead of throwing error
      // This allows the app to work without Cloudinary configured
      this.logger.warn('Cloudinary not configured - returning placeholder data URL');
      const base64 = buffer.toString('base64');
      const mimeType = 'image/jpeg'; // Default to JPEG
      return {
        url: `data:${mimeType};base64,${base64}`,
        publicId: `placeholder-${Date.now()}`,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error);
            reject(new BadRequestException('Failed to upload image'));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new BadRequestException('Upload failed - no result'));
          }
        },
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Upload image from base64 string
   */
  async uploadImageFromBase64(
    base64String: string,
    folder: string = 'courtmate',
    publicId?: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!this.isConfigured) {
      // Return the base64 data URL as-is instead of throwing error
      // This allows the app to work without Cloudinary configured
      this.logger.warn('Cloudinary not configured - returning base64 data URL');
      // Ensure it's a proper data URL
      if (!base64String.startsWith('data:')) {
        const mimeType = 'image/jpeg'; // Default to JPEG
        return {
          url: `data:${mimeType};base64,${base64String}`,
          publicId: `placeholder-${Date.now()}`,
        };
      }
      return {
        url: base64String,
        publicId: `placeholder-${Date.now()}`,
      };
    }

    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');

    try {
      const result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${base64Data}`,
        {
          folder,
          public_id: publicId,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
      );

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      this.logger.error('Cloudinary upload error:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    if (!this.isConfigured) {
      return; // Silently fail if not configured
    }

    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Deleted image: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete image ${publicId}:`, error);
      // Don't throw - deletion failures shouldn't break the flow
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  extractPublicId(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) {
      return null;
    }

    try {
      const matches = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp)/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if Cloudinary is configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

