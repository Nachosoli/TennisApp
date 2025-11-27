'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth-store';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { authApi } from '@/lib/auth';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhotoUpload } from '@/components/PhotoUpload';
import { PageLoader } from '@/components/ui/PageLoader';
import { getErrorMessage } from '@/lib/errors';
import { Court, User } from '@/types';
import { getRatingValueOptions, getMaxRatingValue, getMinRatingValue, RatingType } from '@/lib/rating-utils';

const completeProfileSchema = z.object({
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  ratingType: z.enum(['utr', 'usta', 'ultimate', 'custom', '']).optional(),
  ratingValue: z.number().min(0).max(16.5), // Max is 16.5 for UTR
}).refine(
  (data) => {
    // Both must be empty or both must be populated
    const hasRatingType = data.ratingType !== undefined && data.ratingType !== null && data.ratingType !== '';
    const hasRatingValue = data.ratingValue !== undefined && data.ratingValue !== null;
    return hasRatingType === hasRatingValue;
  },
  {
    message: 'Rating Type and Rating Value must both be set or both be empty',
    path: ['ratingValue'],
  }
);

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

export default function CompleteProfilePage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useRequireAuth();
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [photoChanged, setPhotoChanged] = useState(false);
  const initialPhotoUrlRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      bio: '',
      ratingType: undefined,
      ratingValue: 3.0,
    },
  });

  // Watch for changes
  const watchedValues = watch();
  const selectedRatingType = watch('ratingType') as RatingType;
  
  // Reset rating value when rating type changes
  useEffect(() => {
    if (selectedRatingType) {
      const options = getRatingValueOptions(selectedRatingType);
      if (options.length > 0) {
        // Set to first option if current value is not valid for new type
        const currentValue = watch('ratingValue');
        const isValid = options.some(opt => opt.value === currentValue);
        if (!isValid) {
          setValue('ratingValue', options[0].value);
        }
      }
    }
  }, [selectedRatingType, setValue, watch]);
  
  useEffect(() => {
    if (user) {
      reset({
        bio: user.bio || '',
        ratingType: user.ratingType || undefined,
        ratingValue: user.ratingValue ?? undefined,
      });
      initialPhotoUrlRef.current = (user as any).photoUrl || null;
      setPhotoChanged(false);
    }
  }, [user, reset]);

  useEffect(() => {
    if (!user) return;
    
    // Check if form has any changes from initial values
    const initialBio = user.bio || '';
    const initialRatingType = user.ratingType || undefined;
    const initialRatingValue = user.ratingValue ?? 3.0;
    const currentPhotoUrl = (user as any).photoUrl || null;
    
    const bioChanged = watchedValues.bio !== initialBio;
    const ratingTypeChanged = watchedValues.ratingType !== initialRatingType;
    const ratingValueChanged = watchedValues.ratingValue !== initialRatingValue;
    const photoHasChanged = photoChanged && currentPhotoUrl !== initialPhotoUrlRef.current;
    
    setHasChanges(bioChanged || ratingTypeChanged || ratingValueChanged || photoHasChanged);
  }, [watchedValues, user, photoChanged]);
  
  // Track photo URL changes
  useEffect(() => {
    if (!user) return;
    const currentPhotoUrl = (user as any).photoUrl || null;
    if (currentPhotoUrl !== initialPhotoUrlRef.current && initialPhotoUrlRef.current !== null) {
      setPhotoChanged(true);
    }
  }, [(user as any)?.photoUrl]);

  const onSubmit = async (data: CompleteProfileFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const updateData: any = {};
      // Only include fields that have values (don't send empty strings for optional fields)
      if (data.bio !== undefined) updateData.bio = data.bio || '';
      if (data.ratingType) {
        updateData.ratingType = data.ratingType;
      }
      if (data.ratingValue !== undefined && data.ratingValue !== null) {
        updateData.ratingValue = Number(data.ratingValue);
      }

      const updatedUser = await authApi.updateProfile(updateData);
      setUser(updatedUser);
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">
            Add optional information to help other players get to know you better
          </p>
        </div>

        {/* Profile Photo */}
        <Card title="Profile Photo">
          <PhotoUpload
            currentPhotoUrl={(user as any).photoUrl}
            onUploadComplete={(photoUrl) => {
              setUser({ ...user, photoUrl: photoUrl } as User);
              setPhotoChanged(true);
            }}
            size="lg"
          />
        </Card>

        <Card title="Additional Information">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Bio
              </label>
              <textarea
                {...register('bio')}
                rows={4}
                maxLength={500}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                placeholder="Tell us about yourself..."
              />
              <p className="mt-1.5 text-sm text-gray-600">
                {(watchedValues.bio || '').length}/500 characters
              </p>
              {errors.bio && (
                <p className="mt-1.5 text-sm font-medium text-red-700">{errors.bio.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Rating Type
                </label>
                <select
                  {...register('ratingType')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Select rating type</option>
                  <option value="utr">UTR</option>
                  <option value="usta">USTA</option>
                  <option value="ultimate">Ultimate</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Rating Value {selectedRatingType && selectedRatingType !== '' ? '*' : ''}
                </label>
                <select
                  {...register('ratingValue', { 
                    setValueAs: (v) => v === '' ? undefined : parseFloat(v),
                    valueAsNumber: true,
                  })}
                  value={watch('ratingValue')?.toString() || ''}
                  disabled={!selectedRatingType || selectedRatingType === ''}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select rating value</option>
                  {selectedRatingType && selectedRatingType !== '' && getRatingValueOptions(selectedRatingType).map((option) => (
                    <option key={option.value} value={option.value.toString()}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.ratingValue && (
                  <p className="mt-1.5 text-sm font-medium text-red-700">{errors.ratingValue.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="flex-1"
              >
                Skip / Complete Later
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={isLoading}
                disabled={!hasChanges && isLoading === false}
              >
                Save
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}

