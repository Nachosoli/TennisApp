'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { CalendarView } from '@/components/CalendarView';
import { Card } from '@/components/ui/Card';
import { matchesApi } from '@/lib/matches';
import { Match } from '@/types';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';

export default function CalendarPage() {
  const { isLoading: authLoading, user } = useRequireAuth();
  const [filters, setFilters] = useState<{
    skillLevel?: string;
    gender?: string;
    maxDistance?: number;
    surface?: string;
  }>({});
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [distanceValue, setDistanceValue] = useState(50);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Load all matches to calculate counts by distance
  useEffect(() => {
    matchesApi.getAll().then(setAllMatches).catch(console.error);
  }, []);

  // Calculate match count based on filters
  useEffect(() => {
    const filteredCount = allMatches.filter(match => {
      if (filters.skillLevel && match.skillLevel !== filters.skillLevel) return false;
      if (filters.gender && match.gender !== filters.gender) return false;
      if (filters.surface && match.surface !== filters.surface) return false;
      if (filters.maxDistance && match.maxDistance && match.maxDistance > filters.maxDistance * 1609.34) return false;
      return true;
    }).length;
    setMatchCount(filteredCount);
  }, [filters, allMatches]);

  const handleDistanceChange = (value: number) => {
    setDistanceValue(value);
    setFilters({ ...filters, maxDistance: value });
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
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Match Calendar</h1>

        <Card className="p-4">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.gender || ''}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value || undefined })}
              >
                <option value="">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="ANY">Any</option>
              </select>

              <select
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.surface || ''}
                onChange={(e) => setFilters({ ...filters, surface: e.target.value || undefined })}
              >
                <option value="">All Surfaces</option>
                <option value="HARD">Hard</option>
                <option value="CLAY">Clay</option>
                <option value="GRASS">Grass</option>
                <option value="INDOOR">Indoor</option>
              </select>
            </div>

            {/* Distance Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  Max Distance: {distanceValue} miles
                </label>
                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={distanceValue}
                onChange={(e) => handleDistanceChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>5 mi</span>
                <span>100 mi</span>
              </div>
            </div>
          </div>
        </Card>

        <CalendarView filters={filters} onDateSelect={setSelectedDate} />
      </div>
    </Layout>
  );
}
