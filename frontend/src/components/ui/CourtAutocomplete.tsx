'use client';

import { useState, useEffect, useRef } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Court } from '@/types';
import { courtsApi } from '@/lib/matches';

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

interface CourtAutocompleteProps {
  value?: string;
  onChange: (courtId: string) => void;
  courts: Court[];
  error?: string;
}

export const CourtAutocomplete = ({ value, onChange, courts, error }: CourtAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [googlePlaces, setGooglePlaces] = useState<google.maps.places.PlaceResult[]>([]);
  const [isCreatingCourt, setIsCreatingCourt] = useState(false);
  const [showCourtForm, setShowCourtForm] = useState(false);
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [courtFormData, setCourtFormData] = useState({
    surfaceType: 'hard' as 'hard' | 'clay' | 'grass' | 'indoor',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (value && courts.length > 0) {
      const court = courts.find(c => c.id === value);
      if (court) {
        setSelectedCourt(court);
        setSearchTerm(`${court.name} - ${court.address}`);
      }
    }
  }, [value, courts]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (isLoaded && inputRef.current && googleMapsApiKey && !autocompleteRef.current) {
      try {
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment'],
          fields: ['name', 'formatted_address', 'geometry', 'place_id'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place && place.geometry) {
            handleGooglePlaceSelect(place);
          }
        });

        autocompleteRef.current = autocomplete;
      } catch (error) {
        console.error('Failed to initialize Google Places Autocomplete:', error);
      }
    }
  }, [isLoaded, googleMapsApiKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredCourts = courts.filter(court => {
    const searchLower = searchTerm.toLowerCase();
    return (
      court.name.toLowerCase().includes(searchLower) ||
      court.address.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (court: Court) => {
    setSelectedCourt(court);
    setSearchTerm(`${court.name} - ${court.address}`);
    onChange(court.id);
    setIsOpen(false);
  };

  const handleGooglePlaceSelect = async (place: google.maps.places.PlaceResult) => {
    if (!place.name || !place.formatted_address || !place.geometry?.location) {
      console.error('Invalid place data from Google');
      return;
    }

    setIsOpen(false);
    setFormError(null);

    // Check if court already exists by address
    const existingCourt = courts.find(
      c => c.address.toLowerCase() === place.formatted_address!.toLowerCase()
    );

    if (existingCourt) {
      // Court exists, use it
      setSelectedCourt(existingCourt);
      setSearchTerm(`${existingCourt.name} - ${existingCourt.address}`);
      onChange(existingCourt.id);
    } else {
      // Court doesn't exist, show form to collect surface type and isPublic
      setSelectedGooglePlace(place);
      setShowCourtForm(true);
      setSearchTerm(`${place.name} - ${place.formatted_address}`);
    }
  };

  const handleCreateCourt = async () => {
    if (!selectedGooglePlace?.name || !selectedGooglePlace?.formatted_address || !selectedGooglePlace?.geometry?.location) {
      setFormError('Invalid place data');
      return;
    }

    setIsCreatingCourt(true);
    setFormError(null);

    try {
      // Create court with user-provided surface type (always public)
      const newCourt = await courtsApi.create({
        name: selectedGooglePlace.name,
        address: selectedGooglePlace.formatted_address,
        lat: selectedGooglePlace.geometry.location.lat(),
        lng: selectedGooglePlace.geometry.location.lng(),
        surface: courtFormData.surfaceType,
        isPublic: true, // Always public
      });

      setSelectedCourt(newCourt);
      setSearchTerm(`${newCourt.name} - ${newCourt.address}`);
      onChange(newCourt.id);
      setShowCourtForm(false);
      setSelectedGooglePlace(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create court. Please try again.';
      setFormError(errorMessage);
    } finally {
      setIsCreatingCourt(false);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    // Only open dropdown for local courts search if not using Google autocomplete
    if (!isLoaded || !googleMapsApiKey) {
      setIsOpen(true);
    }
    if (!value) {
      setSelectedCourt(null);
      onChange('');
    }
  };

  if (loadError) {
    return (
      <div ref={dropdownRef} className="relative w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Home Court
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for a court..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isCreatingCourt}
        />
        <p className="mt-1 text-sm text-gray-500">
          Using local court search (Google Maps failed to load)
        </p>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Home Court {isCreatingCourt && <span className="text-blue-600">(Creating...)</span>}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => !googleMapsApiKey && setIsOpen(true)}
        placeholder={googleMapsApiKey ? "Search for a court (powered by Google)" : "Search for a court..."}
        className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        disabled={isCreatingCourt}
      />
      {error && (
        <p className="mt-1.5 text-sm font-medium text-red-700">{error}</p>
      )}
      {!showCourtForm && (
        <p className="mt-1 text-sm text-gray-500">
          {googleMapsApiKey 
            ? "Start typing to search courts. If not found, you'll be asked to provide court details."
            : "You need a home court to create matches"}
        </p>
      )}

      {/* Court Creation Form */}
      {showCourtForm && selectedGooglePlace && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900 mb-1">Court Details</p>
            <p className="text-sm text-gray-700">{selectedGooglePlace.name}</p>
            <p className="text-xs text-gray-600">{selectedGooglePlace.formatted_address}</p>
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
                <option value="hard">Hard</option>
                <option value="clay">Clay</option>
                <option value="grass">Grass</option>
                <option value="indoor">Indoor</option>
              </select>
            </div>


            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateCourt}
                disabled={isCreatingCourt}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isCreatingCourt ? 'Creating...' : 'Create Court'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCourtForm(false);
                  setSelectedGooglePlace(null);
                  setSearchTerm('');
                  setFormError(null);
                }}
                disabled={isCreatingCourt}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show local courts dropdown only if Google autocomplete is not available */}
      {isOpen && !googleMapsApiKey && filteredCourts.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredCourts.map((court) => (
            <div
              key={court.id}
              onClick={() => handleSelect(court)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{court.name}</div>
              <div className="text-sm text-gray-600">{court.address}</div>
            </div>
          ))}
        </div>
      )}

      {isOpen && !googleMapsApiKey && searchTerm && filteredCourts.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-600">No courts found matching "{searchTerm}"</p>
          <p className="text-sm text-gray-500 mt-1">Set up Google Maps API to add new courts automatically</p>
        </div>
      )}
    </div>
  );
};

