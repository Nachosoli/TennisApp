'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { courtsApi } from '@/lib/courts';
import { Court } from '@/types';

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

interface HomeCourtAutocompleteProps {
  value?: string; // courtId
  onChange: (courtId: string) => void;
  onCourtCreated?: (court: Court) => void;
  error?: string;
}

interface GooglePlaceSuggestion {
  name: string;
  address: string;
  placeId: string;
  lat: number;
  lng: number;
}

export function HomeCourtAutocomplete({ value, onChange, onCourtCreated, error }: HomeCourtAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [existingCourts, setExistingCourts] = useState<Court[]>([]);
  const [filteredCourts, setFilteredCourts] = useState<Court[]>([]);
  const [googleSuggestions, setGoogleSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCourt, setIsCreatingCourt] = useState(false);
  const [showCourtForm, setShowCourtForm] = useState(false);
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<GooglePlaceSuggestion | null>(null);
  const [courtFormData, setCourtFormData] = useState({
    surfaceType: 'HARD' as 'HARD' | 'CLAY' | 'GRASS' | 'INDOOR',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Load existing courts
  useEffect(() => {
    courtsApi.getDropdown()
      .then(setExistingCourts)
      .catch(console.error);
  }, []);

  // Initialize Google Maps services
  useEffect(() => {
    if (isLoaded && googleMapsApiKey) {
      try {
        // Create a dummy map for PlacesService
        const dummyDiv = document.createElement('div');
        dummyDiv.style.width = '1px';
        dummyDiv.style.height = '1px';
        dummyDiv.style.position = 'absolute';
        dummyDiv.style.top = '-9999px';
        document.body.appendChild(dummyDiv);
        
        const dummyMap = new google.maps.Map(dummyDiv, {
          center: { lat: 0, lng: 0 },
          zoom: 1,
        });
        
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        placesServiceRef.current = new google.maps.places.PlacesService(dummyMap);
      } catch (error) {
        console.error('Failed to initialize Google Maps services:', error);
      }
    }
  }, [isLoaded, googleMapsApiKey]);

  // Find selected court by ID
  useEffect(() => {
    if (value && existingCourts.length > 0) {
      const court = existingCourts.find(c => c.id === value);
      if (court) {
        setSelectedCourt(court);
        setSearchTerm(`${court.name} - ${court.address}`);
      }
    } else if (!value && !showCourtForm) {
      setSelectedCourt(null);
      setSearchTerm('');
    }
  }, [value, existingCourts, showCourtForm]);

  // Search Google Places
  const searchGooglePlaces = useCallback(async (query: string) => {
    if (!autocompleteServiceRef.current || !placesServiceRef.current || !query.trim()) {
      setGoogleSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          types: ['establishment'],
          componentRestrictions: { country: 'us' },
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            // Get details for each prediction to get coordinates
            const promises = predictions.slice(0, 5).map((prediction) => {
              return new Promise<GooglePlaceSuggestion>((resolve, reject) => {
                if (!placesServiceRef.current) {
                  reject(new Error('PlacesService not initialized'));
                  return;
                }

                placesServiceRef.current.getDetails(
                  {
                    placeId: prediction.place_id,
                    fields: ['geometry', 'formatted_address', 'name'],
                  },
                  (place, placeStatus) => {
                    if (placeStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                      const location = place.geometry?.location;
                      if (location) {
                        resolve({
                          name: place.name || prediction.description,
                          address: place.formatted_address || prediction.description,
                          placeId: prediction.place_id,
                          lat: location.lat(),
                          lng: location.lng(),
                        });
                      } else {
                        reject(new Error('No location found'));
                      }
                    } else {
                      reject(new Error('Failed to get place details'));
                    }
                  }
                );
              });
            });

            Promise.allSettled(promises)
              .then((results) => {
                const successfulSuggestions: GooglePlaceSuggestion[] = results
                  .filter((result) => result.status === 'fulfilled')
                  .map((result: any) => result.value);
                setGoogleSuggestions(successfulSuggestions);
                setIsLoading(false);
                
                // Show dropdown if there are suggestions
                if (successfulSuggestions.length > 0 || filteredCourts.length > 0) {
                  setShowDropdown(true);
                }
              })
              .catch((err) => {
                console.error('Error getting place details:', err);
                setGoogleSuggestions([]);
                setIsLoading(false);
              });
          } else {
            setGoogleSuggestions([]);
            setIsLoading(false);
          }
        }
      );
    } catch (err) {
      console.error('Error searching Google Places:', err);
      setGoogleSuggestions([]);
      setIsLoading(false);
    }
  }, [filteredCourts.length]);

  // Filter existing courts and search Google Places when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCourts([]);
      setGoogleSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Filter existing courts
    const query = searchTerm.toLowerCase();
    const filtered = existingCourts.filter(
      court =>
        court.name.toLowerCase().includes(query) ||
        court.address.toLowerCase().includes(query)
    );
    setFilteredCourts(filtered.slice(0, 5));

    // Show dropdown if there are filtered courts
    if (filtered.length > 0) {
      setShowDropdown(true);
    }

    // Debounce Google Places search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (isLoaded && googleMapsApiKey) {
        searchGooglePlaces(searchTerm);
      } else {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, existingCourts, isLoaded, googleMapsApiKey, searchGooglePlaces]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleSelect = (court: Court) => {
    setSelectedCourt(court);
    setSearchTerm(`${court.name} - ${court.address}`);
    onChange(court.id);
    setShowDropdown(false);
    setShowCourtForm(false);
    setSelectedGooglePlace(null);
  };

  const handleGoogleSuggestionClick = (suggestion: GooglePlaceSuggestion) => {
    // Check if court already exists by address
    const existingCourt = existingCourts.find(
      c => c.address.toLowerCase() === suggestion.address.toLowerCase()
    );

    if (existingCourt) {
      // Court exists, use it
      handleSelect(existingCourt);
    } else {
      // Court doesn't exist, show form to collect surface type BEFORE creating
      setSelectedGooglePlace(suggestion);
      setShowCourtForm(true);
      setSearchTerm(`${suggestion.name} - ${suggestion.address}`);
      setShowDropdown(false);
    }
  };

  const handleCreateCourt = async () => {
    if (!selectedGooglePlace) {
      setFormError('Invalid place data');
      return;
    }

    setIsCreatingCourt(true);
    setFormError(null);

    try {
      // Create court with user-provided surface type (always public)
      const newCourt = await courtsApi.create({
        name: selectedGooglePlace.name,
        address: selectedGooglePlace.address,
        lat: selectedGooglePlace.lat,
        lng: selectedGooglePlace.lng,
        surface: courtFormData.surfaceType,
        isPublic: true, // Always public
      });

      // Add to existing courts list
      setExistingCourts([...existingCourts, newCourt]);
      
      // Select the newly created court
      setSelectedCourt(newCourt);
      setSearchTerm(`${newCourt.name} - ${newCourt.address}`);
      onChange(newCourt.id);
      setShowCourtForm(false);
      setSelectedGooglePlace(null);
      onCourtCreated?.(newCourt);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create court. Please try again.';
      setFormError(errorMessage);
    } finally {
      setIsCreatingCourt(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Show dropdown when typing (if there are results)
    if (value.trim() && !showCourtForm) {
      // Dropdown will be shown by useEffect when filteredCourts or googleSuggestions change
    } else if (!value.trim()) {
      setShowDropdown(false);
    }

    // Clear selection if user is typing
    if (selectedCourt && value !== `${selectedCourt.name} - ${selectedCourt.address}`) {
      setSelectedCourt(null);
      onChange('');
    }
  };

  const handleInputFocus = () => {
    if (searchTerm.trim() && (filteredCourts.length > 0 || googleSuggestions.length > 0) && !showCourtForm) {
      setShowDropdown(true);
    }
  };

  const handleCancelForm = () => {
    setShowCourtForm(false);
    setSelectedGooglePlace(null);
    setSearchTerm('');
    setFormError(null);
    setSelectedCourt(null);
    onChange('');
  };

  const hasSuggestions = filteredCourts.length > 0 || googleSuggestions.length > 0;
  const shouldShowDropdown = showDropdown && !showCourtForm && hasSuggestions;

  return (
    <div ref={dropdownRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder="Search for a facility..."
        className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${isCreatingCourt || showCourtForm ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isCreatingCourt || showCourtForm}
        style={{ color: '#111827' }}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-sm font-medium text-red-700">{error}</p>
      )}

      {/* Unified Dropdown with Existing Courts and Google Places */}
      {shouldShowDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* Existing Courts Section */}
          {filteredCourts.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                Existing Facilities
              </div>
              {filteredCourts.map((court) => (
                <div
                  key={court.id}
                  onClick={() => handleSelect(court)}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-gray-900">{court.name}</div>
                  <div className="text-sm text-gray-600">{court.address}</div>
                </div>
              ))}
            </>
          )}

          {/* Google Places Suggestions Section */}
          {googleSuggestions.length > 0 && (
            <>
              {filteredCourts.length > 0 && (
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-t border-gray-200 border-b border-gray-200">
                  Add New Facility
                </div>
              )}
              {!filteredCourts.length && (
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                  Add New Facility
                </div>
              )}
              {googleSuggestions.map((suggestion) => (
                <div
                  key={suggestion.placeId}
                  onClick={() => handleGoogleSuggestionClick(suggestion)}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-gray-900">{suggestion.name}</div>
                  <div className="text-sm text-gray-600">{suggestion.address}</div>
                  <div className="text-xs text-blue-600 mt-1">Click to add new facility</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Court Creation Form - shown when Google Place selected that doesn't exist */}
      {showCourtForm && selectedGooglePlace && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900 mb-1">Facility Details</p>
            <p className="text-sm text-gray-700 font-semibold">{selectedGooglePlace.name}</p>
            <p className="text-xs text-gray-600">{selectedGooglePlace.address}</p>
          </div>

          {formError && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surface Type *
              </label>
              <select
                value={courtFormData.surfaceType}
                onChange={(e) => setCourtFormData({ ...courtFormData, surfaceType: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isCreatingCourt}
              >
                <option value="HARD">Hard</option>
                <option value="CLAY">Clay</option>
                <option value="GRASS">Grass</option>
                <option value="INDOOR">Indoor</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateCourt}
                disabled={isCreatingCourt}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {isCreatingCourt ? 'Creating...' : 'Create Facility'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={isCreatingCourt}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!showCourtForm && (
        <p className="mt-1.5 text-sm text-gray-600">
          Your home court helps other players find matches near you. Search for an existing facility or select one from Google to create a new one.
        </p>
      )}
    </div>
  );
}
