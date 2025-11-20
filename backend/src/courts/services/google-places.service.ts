import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@googlemaps/google-maps-services-js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class GooglePlacesService {
  private googleMapsClient: Client;
  private apiKey: string;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
    this.googleMapsClient = new Client({});
  }

  async validateAndGeocodeAddress(address: string): Promise<{
    formattedAddress: string;
    latitude: number;
    longitude: number;
    placeId?: string;
  }> {
    // Check cache first
    const cacheKey = `address:${address}`;
    const cached = await this.cacheManager.get<{
      formattedAddress: string;
      latitude: number;
      longitude: number;
      placeId?: string;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    if (!this.apiKey) {
      // If no API key, return basic validation
      throw new BadRequestException('Google Maps API key not configured');
    }

    try {
      const response = await this.googleMapsClient.geocode({
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (!response.data.results || response.data.results.length === 0) {
        throw new BadRequestException('Address not found');
      }

      const result = response.data.results[0];
      const location = result.geometry.location;

      const geocodedData = {
        formattedAddress: result.formatted_address,
        latitude: location.lat,
        longitude: location.lng,
        placeId: result.place_id,
      };

      // Cache for 7 days
      await this.cacheManager.set(cacheKey, geocodedData, 7 * 24 * 60 * 60 * 1000);

      return geocodedData;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to validate address');
    }
  }

  async searchPlaces(query: string): Promise<any[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await this.googleMapsClient.textSearch({
        params: {
          query: `${query} tennis court`,
          key: this.apiKey,
        },
      });

      return response.data.results || [];
    } catch (error) {
      return [];
    }
  }
}

