'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/auth';
import { usersApi } from '@/lib/users';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Court } from '@/types';
import { getErrorMessage } from '@/lib/errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import { courtsApi } from '@/lib/courts';
import { useLoadScript } from '@react-google-maps/api';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  gender: z.union([z.enum(['male', 'female']), z.literal('')]).refine(
    (val) => val !== '',
    { message: 'Please select your gender' }
  ),
  ratingType: z.enum(['utr', 'usta', 'ultimate', 'custom', '']).optional(),
  ratingValue: z.number().min(0).max(12, 'Rating must be between 0 and 12').optional(),
}).refine(
  (data) => {
    // Both must be empty or both must be populated
    const hasRatingType = data.ratingType !== undefined && data.ratingType !== null && data.ratingType !== '';
    const hasRatingValue = data.ratingValue !== undefined && data.ratingValue !== null;
    return hasRatingType === hasRatingValue;
  },
  {
    message: 'Rating Type and Rating Value must both be set or both be empty',
    path: ['ratingValue'], // This will show the error on the ratingValue field
  }
);

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfilePageContent() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useRequireAuth();
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  
  // Phone verification state
  const [showPhoneVerificationModal, setShowPhoneVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [phoneVerificationError, setPhoneVerificationError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  
  // Home Court facility search state
  const [facilityName, setFacilityName] = useState('');
  const [matchingFacilities, setMatchingFacilities] = useState<Court[]>([]);
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [selectedFacilityName, setSelectedFacilityName] = useState<string | null>(null);
  const [isSearchingFacility, setIsSearchingFacility] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFacilityResults, setShowFacilityResults] = useState(false);
  const [showNewFacilityForm, setShowNewFacilityForm] = useState(false);
  const [newFacilityAddress, setNewFacilityAddress] = useState('');
  const [newFacilitySurfaceType, setNewFacilitySurfaceType] = useState<'hard' | 'clay' | 'grass' | 'indoor'>('hard');
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [isCreatingFacility, setIsCreatingFacility] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const facilityInputRef = useRef<HTMLInputElement>(null);
  const facilityDropdownRef = useRef<HTMLDivElement>(null);
  
  // Google Maps
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded: isGoogleMapsLoaded } = useLoadScript({
    googleMapsApiKey,
    libraries: ['places'],
  });

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (isGoogleMapsLoaded && addressInputRef.current && googleMapsApiKey && !autocompleteRef.current && showNewFacilityForm) {
      try {
        const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
          types: ['establishment'],
          fields: ['geometry', 'formatted_address', 'name', 'place_id'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place && place.geometry) {
            setSelectedGooglePlace(place);
            setNewFacilityAddress(place.formatted_address || '');
          }
        });

        autocompleteRef.current = autocomplete;
      } catch (error) {
        console.error('Failed to initialize Google Places Autocomplete:', error);
      }
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isGoogleMapsLoaded, googleMapsApiKey, showNewFacilityForm]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    getValues,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Fetch fresh user data when component mounts to ensure phone number is loaded
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const freshUser = await authApi.getCurrentUser();
        setUser(freshUser);
      } catch (error) {
        console.error('Failed to fetch fresh user data:', error);
        // Don't show error to user, just use cached data
      }
    };

    if (user) {
      fetchUserData();
    }
  }, []); // Only run once on mount

  useEffect(() => {
    if (user) {
      console.log('Profile: Resetting form with user data:', { phone: user.phone, user });
      // Normalize gender: if 'other' or invalid, show "Select gender" (empty string)
      const userGender = (user as any).gender?.toLowerCase();
      const normalizedGender = (userGender === 'male' || userGender === 'female') ? userGender : '';
      
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        bio: user.bio || '',
        gender: normalizedGender,
        ratingType: user.ratingType || '',
        ratingValue: user.ratingValue ?? undefined, // Only set if ratingType is set
      });
    }
  }, [user, reset]);

  const handleResendVerificationEmail = async () => {
    try {
      setResendingEmail(true);
      await authApi.resendVerificationEmail();
      setError(null);
      alert('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setResendingEmail(false);
    }
  };

  // Manual facility search function
  const handleSearchFacility = async () => {
    if (!facilityName.trim()) {
      setError('Please enter a facility name to search');
      return;
    }

    setIsSearchingFacility(true);
    setError(null);
    setHasSearched(true);
    setShowNewFacilityForm(false);

    try {
      const courts = await courtsApi.searchByName(facilityName.trim());
      setMatchingFacilities(courts);
      setShowFacilityResults(courts.length > 0);
      setShowFacilityDropdown(courts.length > 0);
    } catch (err: any) {
      console.error('Facility search error:', err);
      setMatchingFacilities([]);
      setShowFacilityResults(false);
      setShowFacilityDropdown(false);
      // Don't show error to user, just show "no results" state
    } finally {
      setIsSearchingFacility(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        facilityDropdownRef.current &&
        !facilityDropdownRef.current.contains(event.target as Node) &&
        facilityInputRef.current &&
        !facilityInputRef.current.contains(event.target as Node)
      ) {
        setShowFacilityDropdown(false);
      }
    };

    if (showFacilityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFacilityDropdown]);

  const handleFacilitySelect = (court: Court) => {
    setSelectedFacilityId(court.id);
    setSelectedFacilityName(court.name);
    setFacilityName(court.name);
    setShowFacilityDropdown(false);
    setMatchingFacilities([]);
    setShowNewFacilityForm(false);
    setHasSearched(false);
    setShowFacilityResults(false);
  };

  const handleShowNewFacilityForm = () => {
    setShowNewFacilityForm(true);
    setShowFacilityDropdown(false);
    setMatchingFacilities([]);
    setShowFacilityResults(false);
  };

  const handleCreateFacility = async () => {
    if (!facilityName.trim() || !newFacilityAddress.trim() || !selectedGooglePlace) {
      setError('Please fill in all fields and select an address from the suggestions');
      return;
    }

    setIsCreatingFacility(true);
    setError(null);

    try {
      const location = selectedGooglePlace.geometry?.location;
      if (!location) {
        throw new Error('Invalid address location');
      }

      const newCourt = await courtsApi.create({
        name: facilityName.trim(),
        address: newFacilityAddress,
        lat: location.lat(),
        lng: location.lng(),
        surface: newFacilitySurfaceType,
        isPublic: true,
      });

      // Update user's home court
      const updatedUser = await authApi.updateProfile({
        homeCourtId: newCourt.id,
      });
      setUser(updatedUser);

      // Store the created facility info for display
      setSelectedFacilityId(newCourt.id);
      setSelectedFacilityName(newCourt.name);
      
      // Reset form fields but keep facility name for display
      setNewFacilityAddress('');
      setSelectedGooglePlace(null);
      setShowNewFacilityForm(false);
      setMatchingFacilities([]);
      setShowFacilityDropdown(false);
      setHasSearched(false);
      setShowFacilityResults(false);
      
      // Refresh page to show updated home court
      router.refresh();
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsCreatingFacility(false);
    }
  };

  const handleChangeFacility = () => {
    // Reset all facility-related state to show the input again
    setFacilityName('');
    setSelectedFacilityId(null);
    setSelectedFacilityName(null);
    setMatchingFacilities([]);
    setShowFacilityDropdown(false);
    setShowNewFacilityForm(false);
    setNewFacilityAddress('');
    setSelectedGooglePlace(null);
    setHasSearched(false);
    setShowFacilityResults(false);
  };

  const handleClearHomeCourt = async () => {
    try {
      const updatedUser = await authApi.updateProfile({
        homeCourtId: undefined,
      });
      setUser(updatedUser);
      setFacilityName('');
      setSelectedFacilityId(null);
      setSelectedFacilityName(null);
      setMatchingFacilities([]);
      setShowFacilityDropdown(false);
      setShowNewFacilityForm(false);
      router.refresh();
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    }
  };

  const handleSendPhoneVerificationCode = async () => {
    if (!user?.phone) {
      setPhoneVerificationError('Please add a phone number first');
      return;
    }

    try {
      setIsSendingCode(true);
      setPhoneVerificationError(null);
      await authApi.sendPhoneVerificationCode(user.phone);
      setCodeSent(true);
      setShowPhoneVerificationModal(true);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setPhoneVerificationError(errorMessage);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!user?.phone) {
      setPhoneVerificationError('Phone number not found');
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      setPhoneVerificationError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsVerifyingCode(true);
      setPhoneVerificationError(null);
      await authApi.verifyPhone(user.phone, verificationCode);
      
      // Refresh user data to get updated phoneVerified status
      const updatedUser = await authApi.getCurrentUser();
      setUser(updatedUser);
      
      // Close modal and reset state
      setShowPhoneVerificationModal(false);
      setVerificationCode('');
      setCodeSent(false);
      setError(null);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setPhoneVerificationError(errorMessage);
    } finally {
      setIsVerifyingCode(false);
    }
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

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if there's a new facility to create
      let newFacilityId = selectedFacilityId;
      if (showNewFacilityForm && facilityName.trim() && newFacilityAddress.trim() && selectedGooglePlace) {
        try {
          const location = selectedGooglePlace.geometry?.location;
          if (!location) {
            throw new Error('Invalid address location');
          }
          const newCourt = await courtsApi.create({
            name: facilityName.trim(),
            address: newFacilityAddress,
            lat: location.lat(),
            lng: location.lng(),
            surface: newFacilitySurfaceType,
            isPublic: true,
          });
          newFacilityId = newCourt.id;
          setSelectedFacilityId(newCourt.id);
          setSelectedFacilityName(newCourt.name);
          // Reset form fields
          setNewFacilityAddress('');
          setSelectedGooglePlace(null);
          setShowNewFacilityForm(false);
        } catch (err: any) {
          const errorMessage = getErrorMessage(err);
          setError(errorMessage);
          setIsLoading(false);
          return; // Stop submission if court creation fails
        }
      }
      
      // If facility was found, include homeCourtId in update
      // Also preserve existing homeCourtId if user already has one and is not changing it
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        bio: data.bio || undefined,
        gender: data.gender as 'male' | 'female',
        ratingType: (data.ratingType && String(data.ratingType) !== '') ? (data.ratingType as 'utr' | 'usta' | 'ultimate' | 'custom') : undefined,
        ratingValue: (data.ratingType && String(data.ratingType) !== '') ? data.ratingValue : undefined,
      };

      // Preserve existing homeCourtId if user has one, or use newly selected/created facility
      if (newFacilityId) {
        updateData.homeCourtId = newFacilityId;
      } else if (user?.homeCourtId) {
        // Preserve existing home court if not changing it
        updateData.homeCourtId = user.homeCourtId;
      }

      // Update profile via API
      const updatedUser = await authApi.updateProfile(updateData);
      setUser(updatedUser);
      setError(null);
      
      // Reset facility search if it was saved
      if (newFacilityId) {
        setFacilityName('');
        setSelectedFacilityId(null);
        setSelectedFacilityName(null);
        setHasSearched(false);
        setShowFacilityResults(false);
      }

      // Redirect to dashboard after successful update
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Please log in to view your profile</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>

        {/* Photo Upload */}
        <Card title="Profile Photo">
          <PhotoUpload
            currentPhotoUrl={user.photoUrl}
            onUploadComplete={(photoUrl) => {
              setUser({ ...user, photoUrl });
            }}
            size="lg"
          />
        </Card>

        <Card title="Personal Information">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Email Verification Status */}
            {user && !user.emailVerified && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email not verified</p>
                    <p className="text-sm mt-1">Please verify your email address to access all features.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerificationEmail}
                    isLoading={resendingEmail}
                  >
                    Resend Email
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                {...register('firstName')}
                error={errors.firstName?.message}
              />
              <Input
                label="Last Name"
                {...register('lastName')}
                error={errors.lastName?.message}
              />
            </div>

            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            {/* Commented out until SendGrid email verification is enabled
            {user?.emailVerified && (
              <p className="text-sm text-green-600 -mt-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Email verified
              </p>
            )}
            */}

            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    label="Phone"
                    type="tel"
                    {...register('phone')}
                    error={errors.phone?.message}
                  />
                </div>
                {user?.phone && !user?.phoneVerified && (
                  <div className="flex items-end pb-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendPhoneVerificationCode}
                      isLoading={isSendingCode}
                      disabled={isSendingCode}
                    >
                      Verify
                    </Button>
                  </div>
                )}
              </div>
              {/* Commented out until Twilio phone verification is enabled
              {user?.phoneVerified && (
                <p className="text-sm text-green-600 mt-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Phone verified
                </p>
              )}
              */}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender *
              </label>
              <select
                {...register('gender')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                {...register('bio')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Home Court Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Home Court
              </label>
              {user?.homeCourtId ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-lg">
                  <span className="text-gray-900 font-medium">{user?.homeCourt?.name || 'Home court set'}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearHomeCourt}
                  >
                    Change
                  </Button>
                </div>
              ) : selectedFacilityId && selectedFacilityName ? (
                // Show saved facility (either selected from dropdown or newly created)
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-lg">
                  <div>
                    <span className="text-gray-900 font-medium">{selectedFacilityName}</span>
                    <p className="text-sm text-gray-600 mt-1">This will be saved as your home court when you submit the form.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleChangeFacility}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          ref={facilityInputRef}
                          label="Facility"
                          type="text"
                          value={facilityName}
                          onChange={(e) => setFacilityName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchFacility();
                            }
                          }}
                          onFocus={() => {
                            if (matchingFacilities.length > 0) {
                              setShowFacilityDropdown(true);
                            }
                          }}
                          placeholder="Enter facility name"
                          disabled={isSearchingFacility}
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleSearchFacility}
                          isLoading={isSearchingFacility}
                          disabled={isSearchingFacility || !facilityName.trim()}
                        >
                          Search
                        </Button>
                      </div>
                    </div>
                    {isSearchingFacility && (
                      <p className="text-sm text-gray-500 mt-1">Searching...</p>
                    )}

                    {/* Facility Dropdown - Show when matches found */}
                    {hasSearched && !isSearchingFacility && showFacilityResults && showFacilityDropdown && matchingFacilities.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div
                          ref={facilityDropdownRef}
                          className="w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {matchingFacilities.map((court) => (
                            <div
                              key={court.id}
                              onClick={() => handleFacilitySelect(court)}
                              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{court.name}</div>
                              <div className="text-sm text-gray-600">{court.address}</div>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleShowNewFacilityForm}
                          className="w-full"
                        >
                          Add new facility
                        </Button>
                      </div>
                    )}

                    {/* Show "Add new facility" button when no matches found */}
                    {hasSearched && !isSearchingFacility && !showFacilityResults && !showNewFacilityForm && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">No matching facilities found.</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleShowNewFacilityForm}
                          className="w-full"
                        >
                          Add new facility
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* New Facility Form */}
                  {showNewFacilityForm && !selectedFacilityId && (
                    <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600">Facility not found. Please provide additional details:</p>
                      
                      <Input
                        label="Facility Name *"
                        type="text"
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        placeholder="Enter facility name"
                        required
                      />
                      
                      <Input
                        ref={addressInputRef}
                        label="Address *"
                        type="text"
                        value={newFacilityAddress}
                        onChange={(e) => setNewFacilityAddress(e.target.value)}
                        placeholder={isGoogleMapsLoaded ? "Search for an address..." : "Enter address"}
                        required
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Surface Type *
                        </label>
                        <select
                          value={newFacilitySurfaceType}
                          onChange={(e) => setNewFacilitySurfaceType(e.target.value as any)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="hard">Hard</option>
                          <option value="clay">Clay</option>
                          <option value="grass">Grass</option>
                          <option value="indoor">Indoor</option>
                        </select>
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleCreateFacility}
                        isLoading={isCreatingFacility}
                        disabled={!facilityName.trim() || !newFacilityAddress.trim() || !selectedGooglePlace}
                      >
                        Save Facility
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating Type
                </label>
                <select
                  {...register('ratingType')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select rating type</option>
                  <option value="utr">UTR</option>
                  <option value="usta">USTA</option>
                  <option value="ultimate">Ultimate</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating Value {watch('ratingType') && watch('ratingType') !== '' && watch('ratingType') !== undefined ? '*' : ''}
                </label>
                <select
                  {...register('ratingValue', { 
                    setValueAs: (v) => v === '' ? undefined : parseFloat(v),
                    valueAsNumber: true,
                  })}
                  value={watch('ratingValue')?.toString() || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select rating value</option>
                  {Array.from({ length: 25 }, (_, i) => {
                    const value = i * 0.5;
                    return (
                      <option key={value} value={value.toString()}>
                        {value}
                      </option>
                    );
                  })}
                </select>
                {errors.ratingValue && (
                  <p className="mt-1 text-sm text-red-600">{errors.ratingValue.message}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Update Profile
            </Button>
          </form>
        </Card>
      </div>

      {/* Phone Verification Modal */}
      {showPhoneVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Verify Phone Number</h2>
            
            {phoneVerificationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {phoneVerificationError}
              </div>
            )}

            {codeSent ? (
              <div className="space-y-4">
                <p className="text-gray-700">
                  We've sent a verification code to <strong>{user?.phone}</strong>. Please enter the code below.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Code
                  </label>
                  <Input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                      setPhoneVerificationError(null);
                    }}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleVerifyPhoneCode}
                    isLoading={isVerifyingCode}
                    disabled={verificationCode.length !== 6 || isVerifyingCode}
                    className="flex-1"
                  >
                    Verify
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPhoneVerificationModal(false);
                      setVerificationCode('');
                      setCodeSent(false);
                      setPhoneVerificationError(null);
                    }}
                    disabled={isVerifyingCode}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSendPhoneVerificationCode}
                    disabled={isSendingCode}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                  >
                    {isSendingCode ? 'Sending...' : 'Resend Code'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-700">
                  Click the button below to send a verification code to <strong>{user?.phone}</strong>.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSendPhoneVerificationCode}
                    isLoading={isSendingCode}
                    disabled={isSendingCode}
                    className="flex-1"
                  >
                    Send Code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPhoneVerificationModal(false);
                      setPhoneVerificationError(null);
                    }}
                    disabled={isSendingCode}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </Layout>
  );
}

export default function ProfilePage() {
  return (
    <ErrorBoundary>
      <ProfilePageContent />
    </ErrorBoundary>
  );
}
