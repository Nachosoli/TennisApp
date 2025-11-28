'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMatchesStore } from '@/stores/matches-store';
import { useAuthStore } from '@/stores/auth-store';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import { applicationsApi } from '@/lib/applications';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChatWindow } from '@/components/ChatWindow';
import { ApplicationsTable } from '@/components/ApplicationsTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSocket } from '@/hooks/useSocket';
import { format } from 'date-fns';
import { Match } from '@/types';
import { parseLocalDate } from '@/lib/date-utils';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const { currentMatch, isLoading, fetchMatchById, optimisticallyAddApplication } = useMatchesStore();
  const { isLoading: authLoading, user } = useRequireAuth();
  const socket = useSocket();
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [applyingSlotId, setApplyingSlotId] = useState<string | null>(null);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (matchId && user) {
      const loadMatch = async () => {
        try {
          setError(null);
          await fetchMatchById(matchId);
        } catch (err: any) {
          console.error('Error fetching match:', err);
          const status = err?.response?.status;
          if (status === 404) {
            setError('Match not found. It may have been deleted or you may not have permission to view it.');
          } else if (status === 403) {
            setError('You do not have permission to view this match.');
          } else {
            setError('Failed to load match details. Please try again.');
          }
        }
      };
      loadMatch();
    }
  }, [matchId, fetchMatchById, user]);

  // Listen for real-time match updates
  useEffect(() => {
    if (!socket.socket || !matchId || !user) return;

    const handleMatchUpdate = (updatedMatch: any) => {
      if (updatedMatch.id === matchId) {
        // Immediately refresh match data
        fetchMatchById(matchId);
      }
    };

    const handleApplicationUpdate = () => {
      // Immediately refresh match data when application is updated
      fetchMatchById(matchId);
    };

    socket.onMatchUpdate(handleMatchUpdate);
    socket.onApplicationUpdate(handleApplicationUpdate);

    return () => {
      socket.offMatchUpdate(handleMatchUpdate);
      socket.offApplicationUpdate(handleApplicationUpdate);
    };
  }, [socket, matchId, fetchMatchById, user]);


  // Conditional returns after all hooks
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

  const handleRetry = async () => {
    if (matchId && user) {
      try {
        setError(null);
        await fetchMatchById(matchId);
      } catch (err: any) {
        console.error('Error retrying match fetch:', err);
        const status = err?.response?.status;
        if (status === 404) {
          setError('Match not found. It may have been deleted or you may not have permission to view it.');
        } else if (status === 403) {
          setError('You do not have permission to view this match.');
        } else {
          setError('Failed to load match details. Please try again.');
        }
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <PageLoader text="Loading match details..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <div className="text-center py-12">
              <div className="mb-4">
                <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Match</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <Button variant="primary" onClick={handleRetry} isLoading={isLoading}>
                  Retry
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => router.back()}>
                  Go Back
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
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

  const isCreator = currentMatch.creatorUserId === user?.id;

  // Helper function to format time by combining match date with time string
  const formatSlotTime = (timeString: string | undefined): string => {
    if (!timeString || !currentMatch.date) {
      return timeString || 'N/A';
    }

    try {
      // Normalize the date - ensure it's in YYYY-MM-DD format
      const matchDate = parseLocalDate(currentMatch.date);
      if (isNaN(matchDate.getTime())) {
        // If date is invalid, try to parse it as a string
        const dateStr = String(currentMatch.date).split('T')[0]; // Get YYYY-MM-DD part
        const dateTimeStr = `${dateStr}T${timeString}`;
        const dateTime = new Date(dateTimeStr);
        if (isNaN(dateTime.getTime())) {
          return timeString; // Fallback to raw time string
        }
        return format(dateTime, 'h:mm a');
      }

      // Normalize time string - handle both "HH:MM:SS" and "HH:MM" formats
      const normalizedTime = timeString.length === 5 ? `${timeString}:00` : timeString;
      
      // Combine date and time
      const dateStr = matchDate.toISOString().split('T')[0]; // Get YYYY-MM-DD
      const dateTimeStr = `${dateStr}T${normalizedTime}`;
      const dateTime = new Date(dateTimeStr);
      
      if (isNaN(dateTime.getTime())) {
        return timeString; // Fallback to raw time string if parsing fails
      }
      
      return format(dateTime, 'h:mm a');
    } catch (error) {
      console.warn('Error formatting time:', error, { timeString, date: currentMatch.date });
      return timeString || 'N/A'; // Fallback to raw time string
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{currentMatch.court?.name}</h1>
            <p className="text-gray-600 mt-1">{currentMatch.court?.address}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentMatch.status?.toLowerCase() === 'confirmed' ? 'bg-green-100 text-green-800' :
              currentMatch.status?.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {currentMatch.status?.toLowerCase() === 'confirmed' && currentMatch.format === 'singles' 
                ? 'Match Set (2/2)' 
                : currentMatch.status}
            </span>
            {currentMatch.status?.toLowerCase() === 'confirmed' && 
             currentMatch.format === 'singles' && 
             !isCreator && 
             !currentMatch.slots?.some(slot => 
               slot.applications?.some(app => 
                 (app.applicantUserId === user?.id || app.userId === user?.id) &&
                 (app.status?.toLowerCase() === 'waitlisted' || app.status?.toLowerCase() === 'confirmed')
               )
             ) && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    setApplyError(null);
                    setApplySuccess(null);
                    const firstSlot = currentMatch.slots?.[0];
                    if (!firstSlot) {
                      setApplyError('No slots available');
                      return;
                    }
                    setApplyingSlotId(firstSlot.id);
                    await applicationsApi.applyToSlot({ matchSlotId: firstSlot.id });
                    setApplySuccess('You have been added to the waitlist!');
                    setTimeout(() => {
                      fetchMatchById(matchId);
                    }, 500);
                    setTimeout(() => setApplySuccess(null), 5000);
                  } catch (error: any) {
                    console.error('Failed to join waitlist:', error);
                    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to join waitlist. Please try again.';
                    setApplyError(errorMessage);
                    setTimeout(() => setApplyError(null), 5000);
                  } finally {
                    setApplyingSlotId(null);
                  }
                }}
                isLoading={applyingSlotId !== null}
              >
                Join Waitlist
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Match Details">
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Date:</span>{' '}
                <span className="text-gray-900">
                  {(() => {
                    try {
                      const matchDate = parseLocalDate(currentMatch.date);
                      if (isNaN(matchDate.getTime())) {
                        return currentMatch.date || 'N/A';
                      }
                      return format(matchDate, 'MMMM dd, yyyy');
                    } catch (error) {
                      console.warn('Error formatting match date:', error, { date: currentMatch.date });
                      return currentMatch.date || 'N/A';
                    }
                  })()}
                </span>
              </div>
              {currentMatch.surface && (
                <div>
                  <span className="font-medium text-gray-700">Surface:</span>{' '}
                  <span className="text-gray-900">{currentMatch.surface}</span>
                </div>
              )}
              {currentMatch.format && (
                <div>
                  <span className="font-medium text-gray-700">Format:</span>{' '}
                  <span className="text-gray-900">
                    {currentMatch.format === 'singles' ? 'Singles' : currentMatch.format === 'doubles' ? 'Doubles' : currentMatch.format}
                  </span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Looking for Gender:</span>{' '}
                <span className="text-gray-900">
                  {currentMatch.gender?.toLowerCase() === 'male' ? 'Male' : currentMatch.gender?.toLowerCase() === 'female' ? 'Female' : 'Any'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created by:</span>{' '}
                <span className="text-gray-900">
                  {currentMatch.creator?.firstName} {currentMatch.creator?.lastName}
                </span>
              </div>
              
              {/* Creator's Information Section */}
              {currentMatch.creator && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Creator's Information</h4>
                  <div className="space-y-2 text-sm">
                    {currentMatch.creator.ratingValue && (
                      <div>
                        <span className="font-medium text-gray-700">Rating: </span>
                        <span className="text-gray-900">
                          {currentMatch.creator.ratingValue}
                          {currentMatch.creator.ratingType && ` (${currentMatch.creator.ratingType})`}
                        </span>
                      </div>
                    )}
                    {currentMatch.creator.stats?.singlesElo && (
                      <div>
                        <span className="font-medium text-gray-700">ELO: </span>
                        <span className="text-gray-900">{Math.round(currentMatch.creator.stats.singlesElo)}</span>
                      </div>
                    )}
                    {currentMatch.creator.gender && (
                      <div>
                        <span className="font-medium text-gray-700">Gender: </span>
                        <span className="text-gray-900">
                          {currentMatch.creator.gender === 'male' ? 'Man' : currentMatch.creator.gender === 'female' ? 'Woman' : currentMatch.creator.gender}
                        </span>
                      </div>
                    )}
                    {currentMatch.creator.stats && currentMatch.creator.stats.totalMatches > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Win Rate: </span>
                        <span className="text-gray-900">
                          {((currentMatch.creator.stats.totalWins / currentMatch.creator.stats.totalMatches) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="Time Slots">
            {applyError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <div className="flex justify-between items-start">
                  <p className="text-sm">{applyError}</p>
                  <button
                    onClick={() => setApplyError(null)}
                    className="ml-2 text-red-800 hover:text-red-900 font-medium"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            {applySuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                <div className="flex justify-between items-start">
                  <p className="text-sm">{applySuccess}</p>
                  <button
                    onClick={() => setApplySuccess(null)}
                    className="ml-2 text-green-800 hover:text-green-900 font-medium"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {currentMatch.slots && currentMatch.slots.length > 0 ? (
                currentMatch.slots.map((slot) => {
                  const isAvailable = slot.status?.toLowerCase() === 'available';
                  const isConfirmed = slot.status?.toLowerCase() === 'confirmed';
                  const isMatchPending = currentMatch.status?.toLowerCase() === 'pending';
                  
                  // Check if current user already has an application for THIS SPECIFIC SLOT
                  const hasApplicationForSlot = slot.applications?.some(app => 
                    (app.applicantUserId === user?.id || app.userId === user?.id) &&
                    (app.status?.toLowerCase() === 'pending' || 
                     app.status?.toLowerCase() === 'waitlisted' || 
                     app.status?.toLowerCase() === 'confirmed')
                  ) || false;
                  
                  // Only grey out if THIS SPECIFIC SLOT is confirmed (not if any slot is confirmed)
                  // Users can apply to multiple slots, so we only disable the slot they've already applied to
                  const shouldGreyOut = isConfirmed && !hasApplicationForSlot;
                  
                  return (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-lg border ${
                        isConfirmed ? 'bg-green-50 border-green-200' :
                        shouldGreyOut ? 'bg-gray-100 border-gray-300 opacity-60' :
                        isAvailable ? 'bg-blue-50 border-blue-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {formatSlotTime(slot.startTime)} - {formatSlotTime(slot.endTime)}
                          </p>
                          <p className="text-sm text-gray-600 capitalize">
                            {(() => {
                              // Check if user has waitlisted application for this slot
                              const hasWaitlistedApp = user && slot.applications?.some(app =>
                                (app.applicantUserId === user.id || app.userId === user.id) &&
                                app.status?.toLowerCase() === 'waitlisted'
                              );
                              if (hasWaitlistedApp) return 'Waitlisted';
                              if (isConfirmed) return 'Confirmed';
                              if (isAvailable) return 'Available';
                              return slot.status || 'Unknown';
                            })()}
                          </p>
                          {isAvailable && !isCreator && !hasApplicationForSlot && (
                            <p className="text-xs text-blue-600 mt-1">Click Apply to join this time slot</p>
                          )}
                          {shouldGreyOut && (
                            <p className="text-xs text-gray-500 mt-1">Match is confirmed</p>
                          )}
                        </div>
                        {!isCreator && isAvailable && isMatchPending && !hasApplicationForSlot && (
                          (() => {
                            // Users can apply to multiple slots, so only check if they've applied to THIS specific slot
                            if (hasApplicationForSlot) {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  className="opacity-50 cursor-not-allowed"
                                >
                                  Applied
                                </Button>
                              );
                            }
                            
                            return (
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={applyingSlotId === slot.id}
                                onClick={async () => {
                                try {
                                  setApplyError(null);
                                  setApplySuccess(null);
                                  setApplyingSlotId(slot.id);
                                  
                                  // Optimistic UI update - immediately update button state
                                  if (user?.id) {
                                    optimisticallyAddApplication(matchId, slot.id, user.id);
                                  }
                                  
                                  // Then make API call
                                  await applicationsApi.applyToSlot({ matchSlotId: slot.id });
                                  setApplySuccess('Application submitted successfully! The match creator will review your request.');
                                  
                                  // Refresh to get actual application data from server
                                  await fetchMatchById(matchId);
                                  
                                  // Clear success message after 5 seconds
                                  setTimeout(() => setApplySuccess(null), 5000);
                                } catch (error: any) {
                                  console.error('Failed to apply:', error);
                                  const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit application. Please try again.';
                                  setApplyError(errorMessage);
                                  // Refresh to ensure UI is in sync and revert optimistic update
                                  await fetchMatchById(matchId);
                                  // Clear error message after 5 seconds
                                  setTimeout(() => setApplyError(null), 5000);
                                } finally {
                                  setApplyingSlotId(null);
                                }
                              }}
                              >
                                Apply
                              </Button>
                            );
                          })()
                        )}
                        {isCreator && isAvailable && (
                          <span className="text-xs text-gray-500">Waiting for applications</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No time slots available for this match.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {isCreator && (
          <ErrorBoundary>
            <Card title="Manage Applications" className="border-2 border-blue-200">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>As the match creator,</strong> you can review and manage applications from players who want to join this match.
                </p>
              </div>
              <ApplicationsTable 
                matchId={matchId} 
                matchFormat={currentMatch.format}
                matchStatus={currentMatch.status}
                onApplicationConfirmed={() => fetchMatchById(matchId)}
              />
            </Card>
          </ErrorBoundary>
        )}

        {/* Chat Section - Only show for creator or confirmed applicant */}
        {(() => {
          const isCreator = currentMatch.creatorUserId === user?.id;
          const hasConfirmedApplication = user && currentMatch.slots?.some(slot =>
            slot.applications?.some(app =>
              (app.applicantUserId === user.id || app.userId === user.id) &&
              app.status?.toLowerCase() === 'confirmed'
            )
          );
          const shouldShowChat = currentMatch.status?.toLowerCase() === 'confirmed' && (isCreator || hasConfirmedApplication);
          
          return shouldShowChat ? (
            <Card>
              <ChatWindow matchId={matchId} />
            </Card>
          ) : null;
        })()}

        {/* Report Score - Only show for creator or confirmed applicant */}
        {(() => {
          const isCreator = currentMatch.creatorUserId === user?.id;
          const hasConfirmedApplication = user && currentMatch.slots?.some(slot =>
            slot.applications?.some(app =>
              (app.applicantUserId === user.id || app.userId === user.id) &&
              app.status?.toLowerCase() === 'confirmed'
            )
          );
          const shouldShowReport = currentMatch.status?.toLowerCase() === 'confirmed' && (isCreator || hasConfirmedApplication);
          
          return shouldShowReport ? (
            <Card title="Match Actions">
              <Link href={`/matches/${matchId}/score`}>
                <Button variant="primary" className="w-full">Enter Score</Button>
              </Link>
            </Card>
          ) : null;
        })()}

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back
          </Button>
        </div>
      </div>
    </Layout>
  );
}
