'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { matchesApi, courtsApi } from '@/lib/matches';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Court } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import Link from 'next/link';

const createMatchSchema = z.object({
  courtId: z.string().min(1, 'Court is required'),
  date: z.string().min(1, 'Date is required'),
  format: z.enum(['SINGLES', 'DOUBLES']),
  skillLevelMin: z.number().min(0).max(10).optional(),
  skillLevelMax: z.number().min(0).max(10).optional(),
  genderFilter: z.union([z.enum(['male', 'female']), z.literal('')]).optional(),
  maxDistance: z.number().optional(),
  surfaceFilter: z.enum(['HARD', 'CLAY', 'GRASS', 'INDOOR']).optional(),
  slots: z.array(z.object({
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
  })).min(1, 'At least one time slot is required'),
});

type CreateMatchFormData = z.infer<typeof createMatchSchema>;

// Generate time options in 30-minute increments (12:00 AM to 11:30 PM)
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const date = new Date();
      date.setHours(hour, minute, 0);
      const time12 = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      // Format as "7:00a" or "10:00a" or "2:00p"
      const formatted = time12.replace(' ', '').toLowerCase();
      options.push({
        value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        label: formatted,
        hour,
        minute,
      });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

// Separate component for time slot field to properly use hooks
function TimeSlotField({
  index,
  field,
  register,
  control,
  setValue,
  errors,
  fieldsLength,
  remove,
}: {
  index: number;
  field: { id: string };
  register: any;
  control: any;
  setValue: any;
  errors: any;
  fieldsLength: number;
  remove: (index: number) => void;
}) {
  const startTime = useWatch({ control, name: `slots.${index}.startTime` });
  const endTime = useWatch({ control, name: `slots.${index}.endTime` });
  
  const startTimeOption = TIME_OPTIONS.find(opt => opt.value === startTime);
  const startHour = startTimeOption?.hour ?? 0;
  const startMinute = startTimeOption?.minute ?? 0;
  
  // Calculate minimum end time (1 hour after start)
  const minEndTime = new Date();
  minEndTime.setHours(startHour, startMinute, 0);
  minEndTime.setHours(minEndTime.getHours() + 1);
  const minEndHour = minEndTime.getHours();
  const minEndMinute = minEndTime.getMinutes();
  
  // Filter end time options to start 1 hour after start time
  const availableEndTimes = TIME_OPTIONS.filter(opt => {
    if (opt.hour < minEndHour) return false;
    if (opt.hour === minEndHour && opt.minute < minEndMinute) return false;
    return true;
  });

  return (
    <div className="flex gap-2 mb-2 items-end">
      <div className="flex-1">
        <label className="block text-xs text-gray-600 mb-1">From</label>
        <select
          {...register(`slots.${index}.startTime`)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onChange={(e) => {
            setValue(`slots.${index}.startTime`, e.target.value);
            // Auto-set end time to 1 hour later if not set
            if (!endTime) {
              const selectedOption = TIME_OPTIONS.find(opt => opt.value === e.target.value);
              if (selectedOption) {
                const endTimeDate = new Date();
                endTimeDate.setHours(selectedOption.hour, selectedOption.minute, 0);
                endTimeDate.setHours(endTimeDate.getHours() + 1);
                const endHour = endTimeDate.getHours();
                const endMinute = endTimeDate.getMinutes();
                const endValue = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                setValue(`slots.${index}.endTime`, endValue);
              }
            }
          }}
        >
          <option value="">Select start time</option>
          {TIME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.slots?.[index]?.startTime && (
          <p className="mt-1 text-sm text-red-600">{errors.slots[index]?.startTime?.message}</p>
        )}
      </div>
      <div className="flex items-center px-2 text-gray-600 font-medium">to</div>
      <div className="flex-1">
        <label className="block text-xs text-gray-600 mb-1">To</label>
        <select
          {...register(`slots.${index}.endTime`)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={!startTime}
        >
          <option value="">Select end time</option>
          {availableEndTimes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.slots?.[index]?.endTime && (
          <p className="mt-1 text-sm text-red-600">{errors.slots[index]?.endTime?.message}</p>
        )}
      </div>
      {fieldsLength > 1 && (
        <Button
          type="button"
          variant="danger"
          onClick={() => remove(index)}
          className="mb-0"
        >
          Remove
        </Button>
      )}
    </div>
  );
}

function CreateMatchPageContent() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useRequireAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<{ link: string; text: string } | null>(null);
  const [homeCourt, setHomeCourt] = useState<Court | null>(null);
  const [isLoadingHomeCourt, setIsLoadingHomeCourt] = useState(true);
  const [homeCourtError, setHomeCourtError] = useState<string | null>(null);

  // Initialize form with default values - hooks must be called before any returns
  const form = useForm<CreateMatchFormData>({
    resolver: zodResolver(createMatchSchema),
    mode: 'onChange',
    defaultValues: {
      format: 'SINGLES',
      courtId: '',
      slots: [{ startTime: '08:00', endTime: '09:00' }], // Default to 8am-9am
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'slots',
  });

  // Update form defaults when user is available
  useEffect(() => {
    if (user?.homeCourtId) {
      setValue('courtId', user.homeCourtId);
    }
  }, [user, setValue]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    if (!user?.homeCourtId) {
      router.push('/profile?error=homeCourtRequired');
      return;
    }

    // Load courts dropdown and user's home court
    setIsLoadingHomeCourt(true);
    setHomeCourtError(null);
    
    Promise.all([
      courtsApi.getDropdown(),
      user.homeCourtId ? courtsApi.getById(user.homeCourtId).catch((err) => {
        console.error('Failed to load home court by ID:', err);
        setHomeCourtError('Failed to load home court details. Please try refreshing the page.');
        return null;
      }) : Promise.resolve(null),
    ]).then(([courtsList, userCourt]) => {
      setCourts(courtsList);
      if (userCourt) {
        setHomeCourt(userCourt);
        setValue('courtId', userCourt.id);
        setHomeCourtError(null);
        
        // Set default surface to home court's surface
        // Backend returns surfaceType ('Hard', 'Clay', etc.), frontend uses surface ('HARD', 'CLAY', etc.)
        if (userCourt.surface) {
          // Map backend surface to frontend format
          const surfaceMap: Record<string, 'HARD' | 'CLAY' | 'GRASS' | 'INDOOR'> = {
            'Hard': 'HARD',
            'Clay': 'CLAY',
            'Grass': 'GRASS',
            'Indoor': 'INDOOR',
            // Also handle if it's already in uppercase (defensive)
            'HARD': 'HARD',
            'CLAY': 'CLAY',
            'GRASS': 'GRASS',
            'INDOOR': 'INDOOR',
          };
          const mappedSurface = surfaceMap[userCourt.surface];
          if (mappedSurface) {
            setValue('surfaceFilter', mappedSurface);
          }
        }
      } else if (courtsList.length > 0) {
        // Fallback: find court in dropdown list
        const courtInList = courtsList.find(c => c.id === user.homeCourtId);
        if (courtInList) {
          setHomeCourt(courtInList);
          setValue('courtId', courtInList.id);
          setHomeCourtError(null);
        } else {
          setHomeCourtError('Home court not found in available courts list.');
        }
      } else {
        setHomeCourtError('No courts available. Please contact support.');
      }
    }).catch((err) => {
      console.error('Failed to load courts:', err);
      setHomeCourtError('Failed to load courts. Please try refreshing the page.');
    }).finally(() => {
      setIsLoadingHomeCourt(false);
    });
  }, [authLoading, user, router, setValue]);

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

  // Helper function to get match-specific error messages with actionable guidance
  const getMatchErrorMessage = (error: any): { message: string; actionLink?: string; actionText?: string } => {
    const status = error?.response?.status;
    const backendMessage = error?.response?.data?.message || error?.message || '';
    const lowerMessage = backendMessage.toLowerCase();

    // Home court required
    if (status === 403 && (lowerMessage.includes('home court') || lowerMessage.includes('homecourt'))) {
      return {
        message: 'You need to set a home court before creating matches. Please add a home court to your profile first.',
        actionLink: '/profile',
        actionText: 'Go to Profile',
      };
    }

    // Phone verification required
    if (status === 403 && (lowerMessage.includes('phone') && lowerMessage.includes('verify'))) {
      return {
        message: 'Please verify your phone number before creating matches. You can verify it in your profile settings.',
        actionLink: '/profile',
        actionText: 'Go to Profile',
      };
    }

    // Court not found
    if (status === 404 && (lowerMessage.includes('court') || lowerMessage.includes('not found'))) {
      return {
        message: 'The selected court could not be found. Please select a different court.',
      };
    }

    // Date in past
    if (status === 400 && (lowerMessage.includes('past') || lowerMessage.includes('date'))) {
      return {
        message: 'Match date cannot be in the past. Please select a future date.',
      };
    }

    // No slots
    if (status === 400 && (lowerMessage.includes('slot') || lowerMessage.includes('time'))) {
      return {
        message: 'At least one time slot is required. Please add at least one time slot for your match.',
      };
    }

    // Validation errors
    if (status === 400 || status === 422) {
      if (backendMessage) {
        return { message: backendMessage };
      }
      return {
        message: 'Please check all fields and ensure they are filled correctly.',
      };
    }

    // Forbidden/Unauthorized
    if (status === 403) {
      return {
        message: backendMessage || 'You do not have permission to create matches. Please check your account settings.',
        actionLink: '/profile',
        actionText: 'Go to Profile',
      };
    }

    // Use default error handler for other cases
    return {
      message: getErrorMessage(error),
    };
  };

  const onSubmit = async (data: CreateMatchFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setErrorAction(null);
      console.log('Form submitted with data:', data);
      
      // Transform data to match backend API
      const requestData: any = {
        courtId: data.courtId,
        date: data.date,
        format: data.format.toLowerCase(), // Convert SINGLES/DOUBLES to singles/doubles
        slots: data.slots,
      };
      
      // Include gender filter if selected (from UI)
      if (data.genderFilter) {
        requestData.genderFilter = data.genderFilter;
      }
      if (data.surfaceFilter) {
        // Map frontend enum format (HARD, CLAY, etc.) to backend format (Hard, Clay, etc.)
        const surfaceMap: Record<string, string> = {
          'HARD': 'Hard',
          'CLAY': 'Clay',
          'GRASS': 'Grass',
          'INDOOR': 'Indoor',
        };
        requestData.surfaceFilter = surfaceMap[data.surfaceFilter] || data.surfaceFilter;
      }
      
      if (data.maxDistance) requestData.maxDistance = data.maxDistance;
      
      console.log('Request data being sent:', requestData);
      const match = await matchesApi.create(requestData);
      router.push(`/matches/${match.id}`);
    } catch (err: any) {
      console.error('Error creating match:', err);
      const errorInfo = getMatchErrorMessage(err);
      setError(errorInfo.message);
      if (errorInfo.actionLink && errorInfo.actionText) {
        setErrorAction({ link: errorInfo.actionLink, text: errorInfo.actionText });
      } else {
        setErrorAction(null);
      }
      setIsLoading(false);
    }
  };


  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Match</h1>

        <Card>
          <form onSubmit={handleSubmit(onSubmit, (errors) => {
            console.log('Form validation errors:', errors);
          })} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{error}</p>
                  </div>
                </div>
                {errorAction && (
                  <div className="mt-3">
                    <Link
                      href={errorAction.link}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-800 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                    >
                      {errorAction.text}
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Court *
              </label>
              {isLoadingHomeCourt ? (
                <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Loading your home court...
                </div>
              ) : homeCourtError ? (
                <div className="w-full px-4 py-2.5 border border-red-300 rounded-lg bg-red-50">
                  <div className="text-sm text-red-700">{homeCourtError}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoadingHomeCourt(true);
                      setHomeCourtError(null);
                      if (user?.homeCourtId) {
                        courtsApi.getById(user.homeCourtId)
                          .then((court) => {
                            setHomeCourt(court);
                            setValue('courtId', court.id);
                            setIsLoadingHomeCourt(false);
                          })
                          .catch((err) => {
                            console.error('Retry failed:', err);
                            setHomeCourtError('Failed to load home court. Please refresh the page.');
                            setIsLoadingHomeCourt(false);
                          });
                      }
                    }}
                    className="mt-2 text-xs text-red-600 underline hover:text-red-800"
                  >
                    Retry
                  </button>
                </div>
              ) : homeCourt ? (
                <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{homeCourt.name}</div>
                      <div className="text-sm text-gray-600">{homeCourt.address}</div>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">Your Home Court</span>
                  </div>
                </div>
              ) : (
                <div className="w-full px-4 py-2.5 border border-red-300 rounded-lg bg-red-50 text-red-700">
                  Home court not found. Please update your profile.
                </div>
              )}
              <input type="hidden" {...register('courtId')} />
              {errors.courtId && (
                <p className="mt-1 text-sm text-red-600">{errors.courtId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Match Format *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="SINGLES"
                    {...register('format')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900">Singles</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="DOUBLES"
                    {...register('format')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900">Doubles</span>
                </label>
              </div>
              {errors.format && (
                <p className="mt-1 text-sm text-red-600">{errors.format.message}</p>
              )}
            </div>

            <Input
              label="Date *"
              type="date"
              {...register('date')}
              error={errors.date?.message}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender Preference
              </label>
              <select
                {...register('genderFilter')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                defaultValue=""
              >
                <option value="">Any</option>
                <option value="female">Woman</option>
                <option value="male">Man</option>
              </select>
              {errors.genderFilter && (
                <p className="mt-1 text-sm text-red-600">{errors.genderFilter.message}</p>
              )}
            </div>

            {user?.ratingValue !== undefined && user?.ratingValue !== null && !isNaN(user.ratingValue) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Skill Level:</span> {Number(user.ratingValue).toFixed(2)}
                </p>
                <p className="text-xs text-blue-600 mt-1">This helps match you with players of similar skill level</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Slots *
              </label>
              {fields.map((field, index) => (
                <TimeSlotField
                  key={field.id}
                  index={index}
                  field={field}
                  register={register}
                  control={control}
                  setValue={setValue}
                  errors={errors}
                  fieldsLength={fields.length}
                  remove={remove}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ startTime: '', endTime: '' })}
              >
                Add Time Slot
              </Button>
              {errors.slots && (
                <p className="mt-1 text-sm text-red-600">{errors.slots.message}</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={isLoading}
              >
                Create Match
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
      </div>
    </Layout>
  );
}

export default function CreateMatchPage() {
  return (
    <ErrorBoundary>
      <CreateMatchPageContent />
    </ErrorBoundary>
  );
}
