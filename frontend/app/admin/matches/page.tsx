'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { PageLoader } from '@/components/ui/PageLoader';
import { adminApi } from '@/lib/admin';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Match } from '@/types';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function AdminMatchesPage() {
  const router = useRouter();
  const { isLoading: authLoading, user, isAdmin } = useRequireAdmin();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const limit = 50;

  const loadMatches = () => {
    if (!user || !isAdmin) {
      return;
    }

    setIsLoading(true);
    setError(null);
    const status = statusFilter === 'all' ? undefined : statusFilter;
    adminApi.getAllMatches(page, limit, search || undefined, status)
      .then((data) => {
        setMatches(data.matches);
        setTotal(data.total);
      })
      .catch((err) => {
        console.error('Failed to load matches:', err);
        setError('Failed to load matches. Please try again.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadMatches();
  }, [user?.id, isAdmin, page, search, statusFilter]);

  const handleForceCancel = async (matchId: string) => {
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancelling the match.');
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      await adminApi.forceCancelMatch(matchId, cancelReason);
      setShowCancelModal(null);
      setCancelReason('');
      loadMatches();
    } catch (err: any) {
      console.error('Failed to cancel match:', err);
      setError(err.response?.data?.message || 'Failed to cancel match. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded capitalize ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getConfirmedApplicant = (match: Match) => {
    if (!match.slots) return null;
    for (const slot of match.slots) {
      if (slot.applications) {
        const confirmed = slot.applications.find(app => app.status === 'confirmed');
        if (confirmed) {
          return confirmed.applicant || confirmed.user;
        }
      }
    }
    return null;
  };

  if (authLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Match Management</h1>
          <Button variant="outline" onClick={() => router.push('/admin')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Card>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setError(null);
                  loadMatches();
                }}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Search and Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="Search by creator name or court name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading matches...</p>
          </div>
        ) : (
          <>
            <Card>
              <div className="mb-4 text-sm text-gray-600">
                Showing {matches.length} of {total} matches
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creator
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Court
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Format
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {matches.map((match) => {
                      const confirmedApplicant = getConfirmedApplicant(match);
                      const matchDate = match.date ? new Date(match.date) : new Date();
                      
                      return (
                        <tr key={match.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {format(matchDate, 'MMM d, yyyy')}
                            </div>
                            {match.slots && match.slots.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {match.slots[0].startTime} - {match.slots[0].endTime}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {match.creator?.firstName} {match.creator?.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{match.creator?.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{match.court?.name}</div>
                            <div className="text-xs text-gray-500">{match.court?.address}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 capitalize">
                              {match.format || 'singles'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(match.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {confirmedApplicant ? (
                              <div className="text-sm text-gray-900">
                                {confirmedApplicant.firstName} {confirmedApplicant.lastName}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">No confirmed applicant</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/matches/${match.id}`)}
                              >
                                View
                              </Button>
                              {match.status !== 'cancelled' && match.status !== 'completed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowCancelModal(match.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Cancel Match Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Force Cancel Match</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to force cancel this match? This action cannot be undone.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (required)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter reason for cancelling this match..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelModal(null);
                    setCancelReason('');
                  }}
                  disabled={isCancelling}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleForceCancel(showCancelModal)}
                  disabled={isCancelling || !cancelReason.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isCancelling ? 'Cancelling...' : 'Force Cancel Match'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}




