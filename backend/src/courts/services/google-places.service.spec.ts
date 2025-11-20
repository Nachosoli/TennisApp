import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException } from '@nestjs/common';
import { GooglePlacesService } from './google-places.service';
import { Client } from '@googlemaps/google-maps-services-js';
import type { Cache } from 'cache-manager';

jest.mock('@googlemaps/google-maps-services-js');

describe('GooglePlacesService', () => {
  let service: GooglePlacesService;
  let cacheManager: Cache;
  let configService: ConfigService;
  let mockGoogleMapsClient: jest.Mocked<Client>;

  const mockCache: Partial<Cache> = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    mockGoogleMapsClient = {
      geocode: jest.fn(),
      textSearch: jest.fn(),
    } as any;

    (Client as jest.Mock).mockImplementation(() => mockGoogleMapsClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GooglePlacesService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GOOGLE_MAPS_API_KEY') {
                return 'test-api-key';
              }
              return null;
            }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<GooglePlacesService>(GooglePlacesService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAndGeocodeAddress', () => {
    const address = '123 Main St, City';

    it('should validate valid address', async () => {
      const geocodedData = {
        formattedAddress: '123 Main St, City, State',
        latitude: 37.7749,
        longitude: -122.4194,
        placeId: 'place-123',
      };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(mockGoogleMapsClient, 'geocode').mockResolvedValue({
        data: {
          results: [
            {
              formatted_address: geocodedData.formattedAddress,
              geometry: {
                location: {
                  lat: geocodedData.latitude,
                  lng: geocodedData.longitude,
                },
              },
              place_id: geocodedData.placeId,
            },
          ],
        },
      } as any);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.validateAndGeocodeAddress(address);

      expect(result).toEqual(geocodedData);
      expect(mockGoogleMapsClient.geocode).toHaveBeenCalled();
    });

    it('should return null for invalid address', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(mockGoogleMapsClient, 'geocode').mockResolvedValue({
        data: {
          results: [],
        },
      } as any);

      await expect(service.validateAndGeocodeAddress(address)).rejects.toThrow(BadRequestException);
    });

    it('should cache results', async () => {
      const geocodedData = {
        formattedAddress: '123 Main St',
        latitude: 37.7749,
        longitude: -122.4194,
      };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(geocodedData);

      const result = await service.validateAndGeocodeAddress(address);

      expect(result).toEqual(geocodedData);
      expect(mockGoogleMapsClient.geocode).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(mockGoogleMapsClient, 'geocode').mockRejectedValue(new Error('API Error'));

      await expect(service.validateAndGeocodeAddress(address)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if API key not configured', async () => {
      const moduleWithoutKey: TestingModule = await Test.createTestingModule({
        providers: [
          GooglePlacesService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => null),
            },
          },
          {
            provide: CACHE_MANAGER,
            useValue: mockCache,
          },
        ],
      }).compile();

      const serviceWithoutKey = moduleWithoutKey.get<GooglePlacesService>(GooglePlacesService);

      await expect(serviceWithoutKey.validateAndGeocodeAddress(address)).rejects.toThrow(BadRequestException);
    });
  });

  describe('searchPlaces', () => {
    it('should search places', async () => {
      const query = 'tennis';
      const mockResults = [{ name: 'Court 1' }, { name: 'Court 2' }];

      jest.spyOn(mockGoogleMapsClient, 'textSearch').mockResolvedValue({
        data: {
          results: mockResults,
        },
      } as any);

      const result = await service.searchPlaces(query);

      expect(result).toEqual(mockResults);
      expect(mockGoogleMapsClient.textSearch).toHaveBeenCalled();
    });

    it('should return empty array if no API key', async () => {
      const moduleWithoutKey: TestingModule = await Test.createTestingModule({
        providers: [
          GooglePlacesService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => null),
            },
          },
          {
            provide: CACHE_MANAGER,
            useValue: mockCache,
          },
        ],
      }).compile();

      const serviceWithoutKey = moduleWithoutKey.get<GooglePlacesService>(GooglePlacesService);

      const result = await serviceWithoutKey.searchPlaces('tennis');

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(mockGoogleMapsClient, 'textSearch').mockRejectedValue(new Error('API Error'));

      const result = await service.searchPlaces('tennis');

      expect(result).toEqual([]);
    });
  });
});

