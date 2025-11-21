'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader } from '@googlemaps/js-api-loader';
import { courtsApi } from '@/lib/courts';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleMap } from '@/components/GoogleMap';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getErrorMessage } from '@/lib/errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';

const createCourtSchema = z.object({
  name: z.string().min(1, 'Court name is required'),
  address: z.string().min(1, 'Address is required'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  surface: z.enum(['HARD', 'CLAY', 'GRASS', 'INDOOR']),
  isPublic: z.boolean(),
});

type CreateCourtFormData = z.infer<typeof createCourtSchema>;

export default function CreateCourtPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useRequireAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCourtFormData>({
    resolver: zodResolver(createCourtSchema),
    defaultValues: {
      isPublic: true,
    },
  });

  const address = watch('address');

  if (authLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user) {
    return null; // Redirect handled by useRequireAuth
  }

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !addressInputRef.current) return;

    const initAutocomplete = async () => {
      try {
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places'],
        });

        await loader.load();
        const { Autocomplete } = await loader.importLibrary('places');

        // Check again that ref is still available after async operations
        if (!addressInputRef.current) return;

        const autocompleteInstance = new Autocomplete(addressInputRef.current, {
          types: ['address'],
          fields: ['geometry', 'formatted_address', 'name'],
        });

        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();
          if (place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setSelectedLocation({ lat, lng });
            setValue('lat', lat);
            setValue('lng', lng);
            if (place.formatted_address) {
              setValue('address', place.formatted_address);
            }
            if (place.name && !address) {
              setValue('name', place.name);
            }
          }
        });

        setAutocomplete(autocompleteInstance);
      } catch (err) {
        console.error('Failed to initialize autocomplete:', err);
      }
    };

    initAutocomplete();
  }, [setValue, address]);

  const onSubmit = async (data: CreateCourtFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      const court = await courtsApi.create(data);
      router.push(`/courts/${court.id}`);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <ErrorBoundary>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Add Court</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <Input
                  label="Court Name *"
                  {...register('name')}
                  error={errors.name?.message}
                  placeholder="Central Park Tennis Court"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    {...register('address')}
                    ref={(e) => {
                      register('address').ref(e);
                      addressInputRef.current = e;
                    }}
                    placeholder="123 Main St, City, State ZIP"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Start typing an address and select from suggestions
                  </p>
                </div>

                {selectedLocation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Location selected:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Latitude (Auto-filled)"
                    type="number"
                    step="any"
                    {...register('lat', { valueAsNumber: true })}
                    error={errors.lat?.message}
                    disabled
                  />
                  <Input
                    label="Longitude (Auto-filled)"
                    type="number"
                    step="any"
                    {...register('lng', { valueAsNumber: true })}
                    error={errors.lng?.message}
                    disabled
                  />
                </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surface *
              </label>
              <select
                {...register('surface')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="HARD">Hard</option>
                <option value="CLAY">Clay</option>
                <option value="GRASS">Grass</option>
                <option value="INDOOR">Indoor</option>
              </select>
              {errors.surface && (
                <p className="mt-1 text-sm text-red-600">{errors.surface.message}</p>
              )}
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isPublic')}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Public Court</span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Public courts are visible to all users
              </p>
            </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    isLoading={isLoading}
                    disabled={!selectedLocation}
                  >
                    Create Court
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>

            <Card title="Preview Location">
              {selectedLocation ? (
                <GoogleMap
                  center={selectedLocation}
                  zoom={15}
                  height="400px"
                />
              ) : (
                <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height: '400px' }}>
                  <div className="text-center p-4">
                    <p className="text-gray-600">Enter an address to see the location on the map</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    </Layout>
  );
}
