'use client';

import { useState, useEffect, useRef } from 'react';
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
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { isRatingInSkillLevel, SkillLevel, RatingType } from '@/lib/rating-utils';

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
  const [filteredMatches, setFilteredMatches] = useState<(Match & { meetsCriteria: boolean })[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  // Hide map by default on mobile, show on desktop
  const [showMap, setShowMap] = useState(false);
  const [homeCourt, setHomeCourt] = useState<Court | null>(null);
  // Collapsed by default on mobile, expanded by default on desktop
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Set initial collapsed state based on screen size and track desktop state
  useEffect(() => {
    const checkScreenSize = () => {
      const desktop = window.innerWidth >= 640; // sm breakpoint
      setIsDesktop(desktop);
      // On desktop, always keep filters visible
      if (desktop) {
        setFiltersCollapsed(false);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  const matchesSectionRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set showMap based on screen size on mount
  useEffect(() => {
    // On desktop (lg breakpoint and above), show map by default
    if (window.innerWidth >= 1024) {
      setShowMap(true);
    }
  }, []);

  // Load all matches to calculate counts by distance
  useEffect(() => {
    matchesApi.getAll().then((matches) => {
      // Filter out cancelled matches, completed matches, confirmed matches (for non-creators), and user's own matches
      const filtered = matches.filter(match => {
        if (match.status?.toLowerCase() === 'cancelled') return false;
        if (match.status?.toLowerCase() === 'completed') return false;
        if (user && match.creatorUserId === user.id) return false;
        
        // Check if user has a waitlisted application for this match
        const hasWaitlistedApplication = user && match.slots?.some(slot =>
          slot.applications?.some(app =>
            (app.applicantUserId === user.id || app.userId === user.id) &&
            app.status?.toLowerCase() === 'waitlisted'
          )
        );
        
        // Always show matches where user is waitlisted, regardless of match status
        if (hasWaitlistedApplication) return true;
        
        // Hide confirmed matches from other users (unless they have a waitlisted application, which we already handled above)
        if (match.status?.toLowerCase() === 'confirmed' && user && match.creatorUserId !== user.id) return false;
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

  // Helper function to check if a rating falls within a skill level range based on rating type
  const isRatingInRange = (rating: number | undefined, ratingType: RatingType | undefined, skillLevel: string): boolean => {
    if (rating === undefined || rating === null || !ratingType) return false; // Exclude matches where creator has no rating or rating type
    
    // Use rating-type-aware skill level checking
    return isRatingInSkillLevel(ratingType, rating, skillLevel as SkillLevel);
  };

  // Calculate match count and filtered matches based on filters
  // Now we show all matches but mark which ones meet criteria
  useEffect(() => {
    const applicantGender = user?.gender?.toUpperCase(); // 'MALE' or 'FEMALE'
    
    const matchesWithCriteria = allMatches.map(match => {
      let meetsGender = true;
      let meetsSkillLevel = true;
      let meetsSurface = true;
      
      const matchGenderFilter = (match as any).genderFilter?.toUpperCase() || null;
      
      // Always check if match accepts applicant's gender (even when no filter is applied)
      // If applicant has no gender set, we can't determine if match accepts them, so don't filter
      const matchAcceptsApplicant = !applicantGender ? true : (
        !matchGenderFilter || 
        matchGenderFilter === 'ANY' || 
        matchGenderFilter === applicantGender
      );
      
      // Gender filter logic: "Play Against" - what gender the applicant wants to play against
      if (filters.gender) {
        const filterGender = filters.gender.toUpperCase(); // 'MALE' or 'FEMALE'
        const creatorGender = match.creator?.gender?.toUpperCase();
        
        // Check 1: Creator's gender must match filter (what applicant wants to play against)
        const creatorMatches = creatorGender === filterGender;
        
        // Check 2: Match must accept applicant's gender (already checked above)
        meetsGender = creatorMatches && matchAcceptsApplicant;
      } else {
        // No gender filter applied, but still check if match accepts applicant's gender
        meetsGender = matchAcceptsApplicant;
      }
      
      // Skill level filter: compare creator's rating against the selected range
      if (filters.skillLevel) {
        const creatorRating = match.creator?.ratingValue;
        const creatorRatingType = match.creator?.ratingType as RatingType | undefined;
        meetsSkillLevel = isRatingInRange(creatorRating, creatorRatingType, filters.skillLevel);
      }
      
      // Surface filter: check match surface
      if (filters.surface) {
        const matchSurface = (match as any).surfaceFilter || match.surface || match.court?.surface;
        meetsSurface = matchSurface && matchSurface.toLowerCase() === filters.surface.toLowerCase();
      }
      
      const meetsCriteria = meetsGender && meetsSkillLevel && meetsSurface;
      
      return {
        ...match,
        meetsCriteria,
      };
    });
    
    setFilteredMatches(matchesWithCriteria);
    // Count only matches that meet all criteria
    setMatchCount(matchesWithCriteria.filter(m => m.meetsCriteria).length);
  }, [filters, allMatches, user]);

  // Handle court selection from map
  const handleCourtSelect = (courtId: string) => {
    setSelectedCourtId(courtId);
    setSelectedDate(null); // Clear date selection when court is selected
    setShowMap(false); // Hide the map
    setFiltersCollapsed(true); // Collapse filters (always, not just mobile)
    // Scroll to matches section and then to first game card
    setTimeout(() => {
      if (matchesSectionRef.current) {
        matchesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // After scrolling to matches section, scroll to first game card
        setTimeout(() => {
          // Find the first game card in the court matches section
          const firstGameCard = document.querySelector('[data-court-matches]')?.querySelector('.border-2.rounded-lg');
          if (firstGameCard) {
            firstGameCard.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
          }
        }, 300);
      }
    }, 100);
  };

  // Get matches to display - filter by court if selected, and only show matches that meet criteria when filters are applied
  const hasActiveFilters = !!(filters.gender || filters.skillLevel || filters.surface);
  const displayMatches = (selectedCourtId
    ? filteredMatches.filter(m => m.courtId === selectedCourtId)
    : filteredMatches
  ).filter(m => {
    // If filters are active, only show matches that meet all criteria
    // If no filters are active, show all matches (they may still be greyed out if they don't accept user's gender)
    if (hasActiveFilters) {
      return m.meetsCriteria;
    }
    // When no filters are active, show all matches (they'll be greyed out if they don't accept user's gender)
    return true;
  });

  // Auto-collapse filters on mobile when scrolling down (more aggressive)
  useEffect(() => {
    // Initialize lastScrollY to current scroll position
    const initialScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    lastScrollY.current = initialScrollY;
    
    // If page is already scrolled down on mobile, collapse filters
    if (window.innerWidth < 640 && initialScrollY > 100 && !filtersCollapsed) {
      setFiltersCollapsed(true);
    }
    
    const handleScroll = () => {
      // Only on mobile
      if (window.innerWidth >= 640) return; // sm breakpoint
      
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // More aggressive: collapse after scrolling down just 30px (was 50px)
      if (currentScrollY > lastScrollY.current + 30 && currentScrollY > 100 && !filtersCollapsed) {
        setFiltersCollapsed(true);
      }
      // Expand when scrolling back to top (within 100px of top)
      else if (currentScrollY < 100 && filtersCollapsed) {
        setFiltersCollapsed(false);
      }
      // Or expand when scrolling up significantly
      else if (currentScrollY < lastScrollY.current - 30 && filtersCollapsed && currentScrollY < 200) {
        setFiltersCollapsed(false);
      }
      
      lastScrollY.current = currentScrollY;
      
      // Reset after scroll stops
      scrollTimeoutRef.current = setTimeout(() => {
        // Keep collapsed state as user left it
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [filtersCollapsed]);

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
        {/* Header with Filters Toggle - More compact on mobile */}
        <div className="flex flex-col gap-1.5 sm:gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900">Find Matches</h1>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Link href="/matches/create" className="flex-1 sm:flex-initial">
                <Button variant="primary" className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Create Match</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </Link>
              <button
                onClick={() => setShowMap(!showMap)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
              >
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
              {/* Mobile: Filters Toggle Button */}
              <button
                onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                className="sm:hidden px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center justify-center gap-1"
                aria-label={filtersCollapsed ? 'Expand filters' : 'Collapse filters'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filters</span>
                <svg
                  className={`w-4 h-4 transition-transform ${filtersCollapsed ? '' : 'rotate-180'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Bar - Compact on mobile, hidden when collapsed, always visible on desktop */}
        {(!filtersCollapsed || isDesktop) && (
          <Card className="bg-white shadow-sm p-2 sm:p-4">
            <div className="space-y-1.5 sm:space-y-4">
              {/* Desktop: Filters Header (no collapse button) */}
              <div className="hidden sm:flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
              </div>
            
              {/* Top Row - Main Filters - More compact on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5 sm:gap-3">
              <select
                className="w-full px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-md"
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
                className="w-full px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-md"
                value={filters.gender || ''}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value || undefined })}
              >
                <option value="">Play Against</option>
                <option value="MALE">Man</option>
                <option value="FEMALE">Woman</option>
              </select>

              <select
                className="w-full px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-md"
                value={filters.surface || ''}
                onChange={(e) => setFilters({ ...filters, surface: e.target.value || undefined })}
              >
                <option value="">All Surfaces</option>
                <option value="hard">Hard</option>
                <option value="clay">Clay</option>
                <option value="grass">Grass</option>
                <option value="indoor">Indoor</option>
              </select>

                {/* Match Count Display - More compact on mobile */}
                <div className="flex items-center justify-center px-2 sm:px-4 py-1.5 sm:py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-xs sm:text-sm font-semibold text-blue-700">
                    {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Main Content - Split Layout (Airbnb Style) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-280px)] min-h-[400px]">
          {/* Left Side - Calendar/List */}
          <div ref={matchesSectionRef} className="overflow-y-auto order-2 lg:order-1">
            <CalendarView 
              filters={filters} 
              matches={displayMatches}
              selectedDate={selectedDate}
              selectedCourtId={selectedCourtId}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setSelectedCourtId(null); // Clear court selection when date is selected
                // Scroll to matches section when date with matches is selected
                if (date && matchesSectionRef.current) {
                  setTimeout(() => {
                    matchesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }
              }}
              onClearCourtSelection={() => setSelectedCourtId(null)}
            />
          </div>

          {/* Right Side - Map */}
          <div className={`${showMap ? 'block' : 'hidden'} lg:block lg:sticky lg:top-4 lg:h-[calc(100vh-280px)] order-1 lg:order-2`}>
            <Card className="h-full overflow-hidden">
              <MatchesMap 
                matches={displayMatches} 
                homeCourt={homeCourt && homeCourt.location ? {
                  coordinates: {
                    coordinates: homeCourt.location.coordinates
                  }
                } : null}
                currentUserId={user?.id}
                onCourtSelect={handleCourtSelect}
              />
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

