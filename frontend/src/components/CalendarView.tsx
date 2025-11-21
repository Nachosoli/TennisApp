'use client';

import { useState, useEffect } from 'react';
import { matchesApi } from '@/lib/matches';
import { Match } from '@/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfDay } from 'date-fns';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { parseLocalDate } from '@/lib/date-utils';

interface CalendarViewProps {
  filters?: {
    skillLevel?: string;
    gender?: string;
    maxDistance?: number;
    surface?: string;
  };
  onDateSelect?: (date: Date | null) => void;
}

export const CalendarView = ({ filters, onDateSelect }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const user = useAuthStore((state) => state.user);
  
  // Helper function to get surface color
  const getSurfaceColor = (surface?: string): string => {
    const surfaceLower = surface?.toLowerCase();
    switch (surfaceLower) {
      case 'clay':
        return 'bg-green-100 border-green-300 text-green-900'; // Green for clay (US)
      case 'hard':
        return 'bg-blue-100 border-blue-300 text-blue-900'; // Blue for hard
      case 'grass':
        return 'bg-emerald-100 border-emerald-300 text-emerald-900'; // Green for grass
      case 'indoor':
        return 'bg-purple-100 border-purple-300 text-purple-900'; // Purple for indoor
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  useEffect(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    setIsLoading(true);
    matchesApi.getCalendar({
      dateFrom: format(monthStart, 'yyyy-MM-dd'),
      dateTo: format(monthEnd, 'yyyy-MM-dd'),
      ...filters,
    })
      .then((matches) => {
        // Filter out cancelled matches and user's own matches (backend stores as lowercase 'cancelled')
        const filtered = matches.filter(match => {
          if (match.status?.toLowerCase() === 'cancelled') return false;
          if (user && match.creatorUserId === user.id) return false;
          return true;
        });
        setMatches(filtered);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [currentDate, filters, user]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get first day of week for the month
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const getMatchesForDay = (day: Date) => {
    const dayStart = startOfDay(day);
    return matches.filter(match => {
      const matchDate = startOfDay(parseLocalDate(match.date));
      return isSameDay(matchDate, dayStart);
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (day: Date) => {
    const dayMatches = getMatchesForDay(day);
    if (dayMatches.length > 0) {
      const newSelectedDate = selectedDate && isSameDay(selectedDate, day) ? null : day;
      setSelectedDate(newSelectedDate);
      if (onDateSelect) {
        onDateSelect(newSelectedDate);
      }
    }
  };

  const selectedDayMatches = selectedDate ? getMatchesForDay(selectedDate) : [];

  return (
    <>
      <Card>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                ←
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                →
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading calendar...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
                  {day}
                </div>
              ))}

              {/* Empty days at start */}
              {emptyDays.map((_, index) => (
                <div key={`empty-${index}`} className="p-2"></div>
              ))}

              {/* Calendar days */}
              {days.map((day) => {
                const dayMatches = getMatchesForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(selectedDate, day);
                const hasMatches = dayMatches.length > 0;
                
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={`p-2 min-h-[80px] border border-gray-200 ${
                      isSelected ? 'bg-blue-100 ring-2 ring-blue-500' :
                      isToday ? 'bg-blue-50' : 'bg-white'
                    } ${hasMatches ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isSelected ? 'text-blue-700' :
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayMatches.slice(0, 2).map((match) => (
                        <div
                          key={match.id}
                          className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate"
                        >
                          {match.court?.name || 'Match'}
                        </div>
                      ))}
                      {dayMatches.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{dayMatches.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Selected Day Matches List */}
      {selectedDate && selectedDayMatches.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Matches on {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <Button variant="outline" size="sm" onClick={() => { setSelectedDate(null); onDateSelect?.(null); }}>
                Clear Selection
              </Button>
            </div>
            <div className="space-y-4">
              {selectedDayMatches.map((match) => {
                const creator = match.creator;
                const creatorStats = creator?.stats;
                const surfaceColor = getSurfaceColor(match.surface);
                
                return (
                  <div 
                    key={match.id} 
                    className={`border-2 rounded-lg p-4 hover:shadow-md transition-all ${surfaceColor}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{match.court?.name || 'Court TBD'}</h4>
                        <p className="text-sm opacity-80 mb-2">{match.court?.address}</p>
                        
                        {/* Creator Info */}
                        <div className="mb-2">
                          <p className="text-sm font-medium">
                            Player: {creator?.firstName && creator?.lastName 
                              ? `${creator.firstName} ${creator.lastName}`
                              : creator?.email || 'Unknown'}
                          </p>
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                          {creator?.ratingValue && (
                            <div>
                              <span className="font-medium">Rating: </span>
                              <span>{creator.ratingValue}</span>
                              {creator.ratingType && (
                                <span className="text-xs opacity-75"> ({creator.ratingType})</span>
                              )}
                            </div>
                          )}
                          {creatorStats?.singlesElo && (
                            <div>
                              <span className="font-medium">ELO: </span>
                              <span>{Math.round(creatorStats.singlesElo)}</span>
                            </div>
                          )}
                          {creatorStats && creatorStats.totalMatches > 0 && (
                            <div className="col-span-2">
                              <span className="font-medium">Win Rate: </span>
                              <span>{((creatorStats.totalWins / creatorStats.totalMatches) * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-white bg-opacity-70">
                          {match.skillLevel}
                        </span>
                        {match.surface && (
                          <span className="text-xs font-medium px-2 py-1 rounded bg-white bg-opacity-70">
                            {match.surface}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-current border-opacity-20">
                      <div className="text-sm opacity-80 space-y-1">
                        <div>
                          <span>Gender: {match.gender?.toLowerCase() === 'male' ? 'Male' : match.gender?.toLowerCase() === 'female' ? 'Female' : 'Any'}</span>
                        </div>
                        {match.format && (
                          <div>
                            <span>Format: {match.format === 'singles' ? 'Singles' : match.format === 'doubles' ? 'Doubles' : match.format || 'N/A'}</span>
                          </div>
                        )}
                        {match.slots && match.slots.length > 0 && (
                          <div>
                            <span>{match.slots.length} time slot{match.slots.length !== 1 ? 's' : ''} available</span>
                          </div>
                        )}
                      </div>
                      <Link href={`/matches/${match.id}`}>
                        <Button 
                          variant="primary" 
                          size="sm" 
                          className="bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-md"
                        >
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

