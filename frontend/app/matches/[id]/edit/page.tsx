'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { useMatchesStore } from '@/stores/matches-store';
import Link from 'next/link';

const editMatchSchema = z.object({
  courtId: z.string().min(1, 'Court is required'),
  date: z.string().min(1, 'Date is required'),
  format: z.enum(['SINGLES', 'DOUBLES']),
  skillLevelMin: z.number().min(0).max(10).optional().nullable(),
  skillLevelMax: z.number().min(0).max(10).optional().nullable(),
  genderFilter: z.union([z.enum(['male', 'female']), z.literal('')]).optional(),
  maxDistance: z.number().optional().nullable(),
  surfaceFilter: z.enum(['hard', 'clay', 'grass', 'indoor']).optional(),
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

// Time slot field component (reused from create page)
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
  
  const minEndTime = new Date();
  minEndTime.setHours(startHour, startMinute, 0);
  minEndTime.setHours(minEndTime.getHours() + 1);
  const minEndHour = minEndTime.getHours();
  const minEndMinute = minEndTime.getMinutes();
  
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
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const { isLoading: authLoading, user } = useRequireAuth();
  const { currentMatch, fetchMatchById } = useMatchesStore();
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMatch, setIsLoadingMatch] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<{ link: string; text: string } | null>(null);

  const form = useForm<EditMatchFormData>({
    resolver: zodResolver(editMatchSchema),
    mode: 'onChange',
    defaultValues: {
      courtId: '',
      date: '',
      format: 'SINGLES',
      slots: [{ startTime: '', endTime: '' }],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isValid },
  } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'slots',
  });

  // Load match data
  useEffect(() => {
    if (matchId && user) {
      setIsLoadingMatch(true);
      fetchMatchById(matchId)
        .then(() => setIsLoadingMatch(false))
        .catch((err) => {
          console.error('Failed to load match:', err);
          setError('Failed to load match. Please try again.');
          setIsLoadingMatch(false);
        });
    }
  }, [matchId, user, fetchMatchById]);

  // Load courts dropdown
  useEffect(() => {
    if (user) {
      courtsApi.getDropdown()
        .then(setCourts)
        .catch(console.error);
    }
  }, [user]);

  // Pre-fill form when match is loaded (and courts are available)
  useEffect(() => {
    if (currentMatch && user && courts.length > 0) {
      // Validate match is pending
      if (currentMatch.status?.toLowerCase() !== 'pending') {
        setError('You can only edit pending matches.');
        setErrorAction({ link: `/matches/${matchId}`, text: 'View Match' });
        return;
      }

      // Validate no confirmed participants
      const hasConfirmedParticipants = currentMatch.slots?.some(slot =>
        slot.applications?.some(app => app.status?.toLowerCase() === 'confirmed')
      );
      if (hasConfirmedParticipants) {
        setError('You cannot edit a match that has confirmed participants.');
        setErrorAction({ link: `/matches/${matchId}`, text: 'View Match' });
        return;
      }

      // Pre-fill form
      const matchDate = new Date(currentMatch.date);
      const formattedDate = matchDate.toISOString().split('T')[0];

      // Map slots safely - handle different time formats and ensure we have valid data
      // If slots array exists but is empty, or slots don't exist, use default
      let mappedSlots: Array<{ startTime: string; endTime: string }>;
      
      if (currentMatch.slots && Array.isArray(currentMatch.slots) && currentMatch.slots.length > 0) {
        const validSlots = currentMatch.slots
          .filter(slot => slot && slot.startTime && slot.endTime) // Filter out invalid slots
          .map(slot => {
            // Handle time format - could be HH:MM:SS or HH:MM
            const startTime = typeof slot.startTime === 'string' 
              ? slot.startTime.substring(0, 5) 
              : '08:00';
            const endTime = typeof slot.endTime === 'string' 
              ? slot.endTime.substring(0, 5) 
              : '09:00';
            return { startTime, endTime };
          });
        
        // If all slots were filtered out, use default
        mappedSlots = validSlots.length > 0 ? validSlots : [{ startTime: '08:00', endTime: '09:00' }];
      } else {
        // No slots or empty array - use default
        mappedSlots = [{ startTime: '08:00', endTime: '09:00' }];
      }

      // Handle gender - backend uses genderFilter, frontend type might use gender
      const genderValue = (currentMatch as any).genderFilter || (currentMatch as any).gender || '';
      const genderFilter = genderValue === 'any' ? '' : genderValue;

      // Handle surface - backend uses surfaceFilter, frontend type might use surface
      const surfaceValue = (currentMatch as any).surfaceFilter || (currentMatch as any).surface;
      const surfaceFilter = surfaceValue as 'hard' | 'clay' | 'grass' | 'indoor' | undefined;

      // Handle format - ensure it's uppercase
      const formatValue = currentMatch.format?.toUpperCase() || 'SINGLES';
      const format = (formatValue === 'SINGLES' || formatValue === 'DOUBLES') 
        ? formatValue as 'SINGLES' | 'DOUBLES' 
        : 'SINGLES';

      console.log('Loading match for edit:', {
        matchId: currentMatch.id,
        courtId: currentMatch.courtId,
        date: formattedDate,
        format: formatValue,
        genderFilter,
        surfaceFilter,
        maxDistance: currentMatch.maxDistance,
        slotsCount: currentMatch.slots?.length || 0,
        slots: currentMatch.slots,
        mappedSlots,
        rawMatch: currentMatch,
      });

      const formData = {
        courtId: currentMatch.courtId || '',
        date: formattedDate,
        format,
        genderFilter: genderFilter as 'male' | 'female' | '',
        surfaceFilter,
        maxDistance: currentMatch.maxDistance ?? undefined, // Convert null to undefined for Zod
        skillLevelMin: (currentMatch as any).skillLevelMin ?? undefined,
        skillLevelMax: (currentMatch as any).skillLevelMax ?? undefined,
        slots: mappedSlots,
      };

      reset(formData, {
        keepDefaultValues: false,
      });

      // Explicitly replace the field array to ensure it updates
      replace(mappedSlots);
    }
  }, [currentMatch, user, matchId, courts, reset, replace]);

  if (authLoading || isLoadingMatch) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  if (!currentMatch) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Match not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const onSubmit = async (data: EditMatchFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setErrorAction(null);
      
      const requestData: any = {
        courtId: data.courtId,
        date: data.date,
        format: data.format.toLowerCase(),
        slots: data.slots,
      };
      
      if (data.genderFilter) {
        requestData.genderFilter = data.genderFilter;
      }
      if (data.surfaceFilter) {
        requestData.surfaceFilter = data.surfaceFilter;
      }
      if (data.maxDistance) {
        requestData.maxDistance = data.maxDistance;
      }
      
      await matchesApi.update(matchId, requestData);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error updating match:', err);
      const errorMessage = err?.response?.data?.message || getErrorMessage(err);
      setError(errorMessage);
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
              <select
                {...register('courtId')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select court</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name} - {court.address}
                  </option>
                ))}
              </select>
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
            </div>

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
                onClick={(e) => {
                  console.log('Update Match button clicked', { isValid, errors, isLoading });
                }}
              >
                Update Match
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

