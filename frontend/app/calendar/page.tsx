'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { CalendarView } from '@/components/CalendarView';
import { MatchesMap } from '@/components/MatchesMap';
import { Card } from '@/components/ui/Card';
import { matchesApi } from '@/lib/matches';
import { Match } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { courtsApi } from '@/lib/courts';
import { Court } from '@/types';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';

export default function CalendarPage() {
  const { isLoading: authLoading, user } = useRequireAuth();
  const authStoreUser = useAuthStore((state) => state.user);
  const [filters, setFilters] = useState<{
    skillLevel?: string;
    gender?: string;
    maxDistance?: number;
    surface?: string;
  }>({});
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [homeCourt, setHomeCourt] = useState<Court | null>(null);

  // Load all matches to calculate counts by distance
  useEffect(() => {
    matchesApi.getAll().then((matches) => {
      // Filter out cancelled matches and user's own matches (backend stores as lowercase 'cancelled')
      const filtered = matches.filter(match => {
        if (match.status === 'CANCELLED' || (match.status as string).toUpperCase() === 'CANCELLED') return false;
        if (user && match.creatorUserId === user.id) return false;
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

  // Helper function to check if a rating falls within a skill level range
  const isRatingInRange = (rating: number | undefined, skillLevel: string): boolean => {
    if (rating === undefined || rating === null) return false; // Exclude matches where creator has no rating
    
    switch (skillLevel) {
      case 'BEGINNER':
        return rating >= 0.5 && rating <= 3.0;
      case 'INTERMEDIATE':
        return rating > 3.0 && rating <= 4.5;
      case 'ADVANCED':
        return rating > 4.5 && rating <= 5.0;
      case 'PRO':
        return rating > 5.0;
      default:
        return true; // If no skill level filter, include all
    }
  };

  // Calculate match count and filtered matches based on filters
  useEffect(() => {
    const filtered = allMatches.filter(match => {
      // Skill level filter: compare creator's rating against the selected range
      if (filters.skillLevel) {
        const creatorRating = match.creator?.ratingValue;
        if (!isRatingInRange(creatorRating, filters.skillLevel)) return false;
      }
      
      // Gender filter: only apply if filter is set
      if (filters.gender && match.gender !== filters.gender) return false;
      
      // Surface filter: only apply if filter is set
      if (filters.surface && match.surface !== filters.surface) return false;
      
      // Distance filter: only apply if filter is set and match has maxDistance
      if (filters.maxDistance && match.maxDistance && match.maxDistance > filters.maxDistance * 1609.34) return false;
      
      return true;
    });
    setFilteredMatches(filtered);
    setMatchCount(filtered.length);
  }, [filters, allMatches]);

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

        {/* Filters Bar - Airbnb Style */}
        <Card className="p-4 bg-white shadow-sm">
          <div className="space-y-4">
            {/* Top Row - Main Filters */}
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
                <option value="HARD">Hard</option>
                <option value="CLAY">Clay</option>
                <option value="GRASS">Grass</option>
                <option value="INDOOR">Indoor</option>
              </select>

              {/* Match Count Display */}
              <div className="flex items-center justify-center px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-semibold text-blue-700">
                  {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content - Split Layout (Airbnb Style) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-280px)]">
          {/* Left Side - Calendar/List */}
          <div className="overflow-y-auto">
            <CalendarView filters={filters} onDateSelect={setSelectedDate} />
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
              />
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

