'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { CalendarView } from '@/components/CalendarView';
import { MatchesMap } from '@/components/MatchesMap';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { matchesApi } from '@/lib/matches';
import { Match } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { courtsApi } from '@/lib/courts';
import { Court } from '@/types';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import { useLoadScript } from '@react-google-maps/api';

export default function CalendarPage() {
  const { isLoading: authLoading, user } = useRequireAuth();
  const authStoreUser = useAuthStore((state) => state.user);
  
  // TODO: Future feature - Re-enable to add back gender/surface/skill level filtering
  // Commented out in favor of city-based search, but preserved for future use
  const [filters, setFilters] = useState<{
    skillLevel?: string;
    gender?: string;
    maxDistance?: number;
    surface?: string;
  }>({});
  
  // City search state
  const [searchCity, setSearchCity] = useState<string>('');
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  
  // Map viewport bounds state for dynamic filtering
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isProgrammaticUpdate, setIsProgrammaticUpdate] = useState(false);
  
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [homeCourt, setHomeCourt] = useState<Court | null>(null);
  
  // Google Maps for geocoding
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded: isGoogleMapsLoaded } = useLoadScript({
    googleMapsApiKey,
    libraries: ['places', 'geometry'],
  });

  // Load all matches to calculate counts by distance
  useEffect(() => {
    matchesApi.getAll().then((matches) => {
      // Filter out cancelled matches, confirmed matches (for non-creators), and user's own matches
      const filtered = matches.filter(match => {
        if (match.status?.toLowerCase() === 'cancelled') return false;
        if (user && match.creatorUserId === user.id) return false;
        
        // Check if user has a waitlisted application for this match
        const hasWaitlistedApplication = user && match.slots?.some(slot =>
          slot.applications?.some(app =>
            (app.applicantUserId === user.id || app.userId === user.id) &&
            app.status?.toLowerCase() === 'waitlisted'
          )
        );
        
        // Hide confirmed matches from other users UNLESS they have a waitlisted application
        if (match.status?.toLowerCase() === 'confirmed' && user && match.creatorUserId !== user.id && !hasWaitlistedApplication) return false;
        return true;
      });
      setAllMatches(filtered);
    }).catch(console.error);
  }, [user]);

  // Load user's home court for map centering
  useEffect(() => {
    if (authStoreUser?.homeCourtId) {
      courtsApi.getById(authStoreUser.homeCourtId)
        .then(setHomeCourt)
        .catch(console.error);
    }
  }, [authStoreUser?.homeCourtId]);

  // TODO: Future feature - Re-enable for skill level filtering
  // Helper function to check if a rating falls within a skill level range
  // const isRatingInRange = (rating: number | undefined, skillLevel: string): boolean => {
  //   if (rating === undefined || rating === null) return false; // Exclude matches where creator has no rating
  //   
  //   switch (skillLevel) {
  //     case 'BEGINNER':
  //       return rating >= 0.5 && rating <= 3.0;
  //     case 'INTERMEDIATE':
  //       return rating > 3.0 && rating <= 4.5;
  //     case 'ADVANCED':
  //       return rating > 4.5 && rating <= 5.0;
  //     case 'PRO':
  //       return rating > 5.0;
  //     default:
  //       return true; // If no skill level filter, include all
  //   }
  // };

  // Calculate distance between two coordinates using Haversine formula (in miles)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Geocode city name to coordinates
  const geocodeCity = (cityName: string) => {
    if (!isGoogleMapsLoaded || !googleMapsApiKey || typeof window === 'undefined' || !(window as any).google) {
      setGeocodeError('Google Maps is not loaded. Please try again.');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    const google = (window as any).google;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: cityName }, (results: any, status: any) => {
      setIsGeocoding(false);
      
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const location = results[0].geometry.location;
        const center = {
          lat: location.lat(),
          lng: location.lng(),
        };
        // Set flag to prevent bounds change from being treated as user interaction
        setIsProgrammaticUpdate(true);
        setSearchCenter(center);
        setGeocodeError(null);
        // Reset user interaction flag when new city is searched
        // This ensures city radius filtering takes precedence
        setHasUserInteracted(false);
        // Clear the flag after a short delay to allow map to update
        setTimeout(() => {
          setIsProgrammaticUpdate(false);
        }, 1000);
      } else {
        setGeocodeError('City not found. Please try again.');
        setSearchCenter(null);
      }
    });
  };

  const handleCitySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCity.trim()) {
      geocodeCity(searchCity.trim());
    }
  };

  const handleClearSearch = () => {
    setSearchCity('');
    setSearchCenter(null);
    setGeocodeError(null);
    setHasUserInteracted(false);
    setMapBounds(null);
  };

  // Handle map bounds changes (when user pans/zooms)
  const handleBoundsChanged = (bounds: google.maps.LatLngBounds | null) => {
    if (bounds) {
      setMapBounds(bounds);
      // Only mark as user interaction if it's not a programmatic update (e.g., from city search)
      // This allows city radius filtering to work initially, then switches to viewport filtering on manual pan/zoom
      if (!isProgrammaticUpdate) {
        setHasUserInteracted(true);
      }
    }
  };

  // Check if a coordinate is within the map bounds
  const isWithinBounds = (lat: number, lng: number, bounds: google.maps.LatLngBounds): boolean => {
    return bounds.contains(new (window as any).google.maps.LatLng(lat, lng));
  };

  // Calculate match count and filtered matches based on viewport bounds or city search
  useEffect(() => {
    let filtered = [...allMatches];
    
    // Priority 1: Viewport bounds filtering (if user has interacted with map)
    if (hasUserInteracted && mapBounds && isGoogleMapsLoaded && typeof window !== 'undefined' && (window as any).google) {
      filtered = filtered.filter(match => {
        if (!match.court?.location?.coordinates) return false;
        const [lng, lat] = match.court.location.coordinates;
        return isWithinBounds(lat, lng, mapBounds);
      });
    }
    // Priority 2: City radius filtering (if city is searched and user hasn't interacted with map)
    else if (searchCenter && !hasUserInteracted) {
      const radiusMiles = 25; // 25-mile radius
      filtered = filtered.filter(match => {
        if (!match.court?.location?.coordinates) return false;
        const [lng, lat] = match.court.location.coordinates;
        const distance = calculateDistance(
          searchCenter.lat,
          searchCenter.lng,
          lat,
          lng
        );
        return distance <= radiusMiles;
      });
    }
    // If no filtering is active, show all matches
    
    // TODO: Future feature - Re-enable to add back gender/surface/skill level filtering
    // Uncomment below to re-enable filters (combine with city search using AND logic)
    // // Skill level filter: compare creator's rating against the selected range
    // if (filters.skillLevel) {
    //   const creatorRating = match.creator?.ratingValue;
    //   if (!isRatingInRange(creatorRating, filters.skillLevel)) return false;
    // }
    // 
    // // Gender filter: only apply if filter is set
    // if (filters.gender && match.gender !== filters.gender) return false;
    // 
    // // Surface filter: only apply if filter is set
    // if (filters.surface && match.surface !== filters.surface) return false;
    // 
    // // Distance filter: only apply if filter is set and match has maxDistance
    // if (filters.maxDistance && match.maxDistance && match.maxDistance > filters.maxDistance * 1609.34) return false;
    
    setFilteredMatches(filtered);
    setMatchCount(filtered.length);
  }, [mapBounds, hasUserInteracted, searchCenter, filters, allMatches, isGoogleMapsLoaded]);

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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Find Tennis Matches</h1>
          <button
            onClick={() => setShowMap(!showMap)}
            className="md:hidden px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
        </div>

        {/* City Search Bar */}
        <Card className="p-4 bg-white shadow-sm">
          <form onSubmit={handleCitySearch} className="flex gap-3 items-center">
            <div className="flex-1">
              <input
                type="text"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="Search city (e.g., Jacksonville, Orlando, Miami)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-md"
                disabled={isGeocoding}
              />
              {geocodeError && (
                <p className="mt-1 text-sm text-red-600">{geocodeError}</p>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={isGeocoding || !searchCity.trim()}
              isLoading={isGeocoding}
            >
              Search
            </Button>
            {searchCenter && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearSearch}
              >
                Clear
              </Button>
            )}
            {/* Match Count Display */}
            <div className="flex items-center justify-center px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg min-w-[120px]">
              <span className="text-sm font-semibold text-blue-700">
                {matchCount} {matchCount === 1 ? 'match' : 'matches'}
              </span>
            </div>
          </form>
        </Card>

        {/* TODO: Future feature - Re-enable to add back gender/surface/skill level filtering
        Filters Bar - Commented out but preserved for future use
        <Card className="p-4 bg-white shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-md"
                value={filters.skillLevel || ''}
                onChange={(e) => setFilters({ ...filters, skillLevel: e.target.value || undefined })}
              >
                <option value="">All Skill Levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="PRO">Pro</option>
              </select>

              <select
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-md"
                value={filters.gender || ''}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value || undefined })}
              >
                <option value="">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="ANY">Any</option>
              </select>

              <select
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-md"
                value={filters.surface || ''}
                onChange={(e) => setFilters({ ...filters, surface: e.target.value || undefined })}
              >
                <option value="">All Surfaces</option>
                <option value="hard">Hard</option>
                <option value="clay">Clay</option>
                <option value="grass">Grass</option>
                <option value="indoor">Indoor</option>
              </select>
            </div>
          </div>
        </Card>
        */}

        {/* Main Content - Split Layout (Airbnb Style) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-280px)]">
          {/* Left Side - Calendar/List */}
          <div className="overflow-y-auto">
            {/* TODO: Future feature - Pass filters when re-enabled
            <CalendarView filters={filters} onDateSelect={setSelectedDate} />
            */}
            <CalendarView matches={filteredMatches} filters={{}} onDateSelect={setSelectedDate} />
          </div>

          {/* Right Side - Map */}
          <div className={`${showMap ? 'block' : 'hidden'} md:block lg:sticky lg:top-4 lg:h-[calc(100vh-280px)]`}>
            <Card className="h-full overflow-hidden">
              <MatchesMap 
                matches={filteredMatches} 
                homeCourt={homeCourt && homeCourt.location ? {
                  coordinates: {
                    coordinates: homeCourt.location.coordinates
                  }
                } : null}
                searchCenter={searchCenter}
                currentUserId={user?.id}
                onBoundsChanged={handleBoundsChanged}
              />
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

