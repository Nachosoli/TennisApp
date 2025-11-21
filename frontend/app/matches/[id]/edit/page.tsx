'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { matchesApi, courtsApi } from '@/lib/matches';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Court, Match } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import Link from 'next/link';
import { useMatchesStore } from '@/stores/matches-store';

const editMatchSchema = z.object({
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

type EditMatchFormData = z.infer<typeof editMatchSchema>;

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

function EditMatchPageContent() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;
  const { isLoading: authLoading, user } = useRequireAuth();
  const { currentMatch, fetchMatchById } = useMatchesStore();
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMatch, setIsLoadingMatch] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<{ link: string; text: string } | null>(null);
  const [homeCourt, setHomeCourt] = useState<Court | null>(null);
  const [isLoadingHomeCourt, setIsLoadingHomeCourt] = useState(true);
  const [homeCourtError, setHomeCourtError] = useState<string | null>(null);

  // Initialize form
  const form = useForm<EditMatchFormData>({
    // @ts-expect-error - zodResolver type compatibility issue with react-hook-form
    resolver: zodResolver(editMatchSchema),
    mode: 'onChange',
    defaultValues: {
      format: 'SINGLES',
      courtId: '',
      slots: [{ startTime: '08:00', endTime: '09:00' }],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'slots',
  });

  // Load match data
  useEffect(() => {
    if (!matchId || !user) return;

    const loadMatch = async () => {
      setIsLoadingMatch(true);
      try {
        await fetchMatchById(matchId);
      } catch (err: any) {
        console.error('Failed to load match:', err);
        setError('Failed to load match. Please try again.');
        setIsLoadingMatch(false);
      }
    };

    loadMatch();
  }, [matchId, user, fetchMatchById]);

  // Load courts and populate form when match is loaded
  useEffect(() => {
    if (!currentMatch || !user || isLoadingMatch) return;

    // Check if user is creator
    if (currentMatch.creatorUserId !== user.id) {
      setError('You do not have permission to edit this match.');
      setIsLoadingMatch(false);
      return;
    }

    // Check if match can be edited
    if (currentMatch.status === 'CONFIRMED') {
      setError('Cannot edit a confirmed match.');
      setIsLoadingMatch(false);
      return;
    }

    // Check if match has confirmed participants
    const hasConfirmedParticipants = currentMatch.slots?.some(slot => 
      slot.application?.status === 'CONFIRMED'
    );
    if (hasConfirmedParticipants) {
      setError('Cannot edit match with confirmed participants.');
      setIsLoadingMatch(false);
      return;
    }

    // Load courts
    setIsLoadingHomeCourt(true);
    courtsApi.getDropdown()
      .then((courtsList) => {
        setCourts(courtsList);
        const court = courtsList.find(c => c.id === currentMatch.courtId);
        if (court) {
          setHomeCourt(court);
        }
        setIsLoadingHomeCourt(false);
      })
      .catch((err) => {
        console.error('Failed to load courts:', err);
        setHomeCourtError('Failed to load courts.');
        setIsLoadingHomeCourt(false);
      });

    // Populate form with match data
    const matchDate = currentMatch.date ? new Date(currentMatch.date).toISOString().split('T')[0] : '';
    const format = currentMatch.format?.toUpperCase() || 'SINGLES';
    const genderFilter = currentMatch.genderFilter?.toLowerCase() || currentMatch.gender?.toLowerCase() || '';
    
    // Get slots (only available slots without confirmed applications)
    const editableSlots = currentMatch.slots?.filter(slot => 
      !slot.application || slot.application.status !== 'CONFIRMED'
    ) || [];

    reset({
      courtId: currentMatch.courtId,
      date: matchDate,
      format: format as 'SINGLES' | 'DOUBLES',
      genderFilter: genderFilter as 'male' | 'female' | '',
      skillLevelMin: currentMatch.skillLevelMin,
      skillLevelMax: currentMatch.skillLevelMax,
      maxDistance: currentMatch.maxDistance,
      surfaceFilter: currentMatch.surface as 'HARD' | 'CLAY' | 'GRASS' | 'INDOOR' | undefined,
      slots: editableSlots.length > 0 
        ? editableSlots.map(slot => ({
            startTime: slot.startTime || '08:00',
            endTime: slot.endTime || '09:00',
          }))
        : [{ startTime: '08:00', endTime: '09:00' }],
    });

    setIsLoadingMatch(false);
  }, [currentMatch, user, reset, isLoadingMatch]);

  if (authLoading || isLoadingMatch) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user) {
    return null; // Redirect handled by useRequireAuth
  }

  if (!currentMatch) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Match not found</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  const getMatchErrorMessage = (error: any): { message: string; actionLink?: string; actionText?: string } => {
    const status = error?.response?.status;
    const backendMessage = error?.response?.data?.message || error?.message || '';
    const lowerMessage = backendMessage.toLowerCase();

    if (status === 403) {
      return {
        message: backendMessage || 'You do not have permission to edit this match.',
      };
    }

    if (status === 400 && (lowerMessage.includes('confirmed') || lowerMessage.includes('participants'))) {
      return {
        message: backendMessage || 'Cannot edit match with confirmed participants.',
      };
    }

    if (status === 400 || status === 422) {
      if (backendMessage) {
        return { message: backendMessage };
      }
      return {
        message: 'Please check all fields and ensure they are filled correctly.',
      };
    }

    return {
      message: getErrorMessage(error),
    };
  };

  const onSubmit = async (data: EditMatchFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setErrorAction(null);
      
      // Transform data to match backend API
      const requestData: any = {
        date: data.date,
        format: data.format.toLowerCase(),
        slots: data.slots,
      };
      
      if (data.genderFilter) {
        requestData.genderFilter = data.genderFilter;
      }
      if (data.surfaceFilter) {
        const surfaceMap: Record<string, string> = {
          'HARD': 'Hard',
          'CLAY': 'Clay',
          'GRASS': 'Grass',
          'INDOOR': 'Indoor',
        };
        requestData.surfaceFilter = surfaceMap[data.surfaceFilter] || data.surfaceFilter;
      }
      if (data.skillLevelMin !== undefined) requestData.skillLevelMin = data.skillLevelMin;
      if (data.skillLevelMax !== undefined) requestData.skillLevelMax = data.skillLevelMax;
      if (data.maxDistance) requestData.maxDistance = data.maxDistance;
      
      await matchesApi.update(matchId, requestData);
      router.push(`/matches/${matchId}`);
    } catch (err: any) {
      console.error('Error updating match:', err);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Match</h1>

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
                  Loading court...
                </div>
              ) : homeCourtError ? (
                <div className="w-full px-4 py-2.5 border border-red-300 rounded-lg bg-red-50">
                  <div className="text-sm text-red-700">{homeCourtError}</div>
                </div>
              ) : homeCourt ? (
                <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{homeCourt.name}</div>
                      <div className="text-sm text-gray-600">{homeCourt.address}</div>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">Court</span>
                  </div>
                </div>
              ) : (
                <div className="w-full px-4 py-2.5 border border-red-300 rounded-lg bg-red-50 text-red-700">
                  Court not found.
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
              >
                <option value="">Any</option>
                <option value="female">Woman</option>
                <option value="male">Man</option>
              </select>
              {errors.genderFilter && (
                <p className="mt-1 text-sm text-red-600">{errors.genderFilter.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Slots * (You can add, edit, or remove time slots)
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
                Save Changes
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

export default function EditMatchPage() {
  return (
    <ErrorBoundary>
      <EditMatchPageContent />
    </ErrorBoundary>
  );
}

