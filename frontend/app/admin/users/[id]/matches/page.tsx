'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { PageLoader } from '@/components/ui/PageLoader';
import { adminApi } from '@/lib/admin';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Match, User } from '@/types';
import { format } from 'date-fns';

export default function AdminUserMatchesPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { isLoading: authLoading, user, isAdmin } = useRequireAdmin();
  const [matches, setMatches] = useState<Match[]>([]);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [userData, matchesData] = await Promise.all([
          adminApi.getUserById(userId),
          adminApi.getUserMatches(userId),
        ]);
        setUserInfo(userData);
        setMatches(matchesData);
      } catch (err: any) {
        console.error('Failed to load user matches:', err);
        setError('Failed to load user matches. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, isAdmin, userId]);

  if (authLoading || isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return null; // Redirect handled by useRequireAdmin
  }

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

  const getUserRole = (match: Match): string => {
    if (match.creatorUserId === userId) {
      return 'Creator';
    }
    // Check if user is a confirmed participant
    const isParticipant = match.slots?.some(slot =>
      slot.applications?.some(app =>
        app.applicantUserId === userId && app.status?.toLowerCase() === 'confirmed'
      )
    );
    return isParticipant ? 'Participant' : 'N/A';
  };

  const getOpponentInfo = (match: Match): string => {
    if (match.creatorUserId === userId) {
      // User is creator, find confirmed participant
      const confirmedSlot = match.slots?.find(slot =>
        slot.applications?.some(app => app.status?.toLowerCase() === 'confirmed')
      );
      if (confirmedSlot?.applications) {
        const confirmedApp = confirmedSlot.applications.find(app => app.status?.toLowerCase() === 'confirmed');
        if (confirmedApp?.applicant) {
          return `${confirmedApp.applicant.firstName} ${confirmedApp.applicant.lastName}`;
        }
        if (confirmedApp?.user) {
          return `${confirmedApp.user.firstName} ${confirmedApp.user.lastName}`;
        }
      }
      const participantCount = match.slots?.reduce((count, slot) => {
        return count + (slot.applications?.filter(app => app.status?.toLowerCase() === 'confirmed').length || 0);
      }, 0) || 0;
      return participantCount > 0 ? `${participantCount} participant(s)` : 'No participants';
    } else {
      // User is participant, show creator
      if (match.creator) {
        return `${match.creator.firstName} ${match.creator.lastName}`;
      }
      return 'N/A';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Matches for {userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'User'}
            </h1>
            {userInfo && (
              <p className="text-sm text-gray-600 mt-1">{userInfo.email}</p>
            )}
          </div>
          <Button variant="outline" onClick={() => router.push(`/admin/users/${userId}`)}>
            Back to User
          </Button>
        </div>

        {error && (
          <Card>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          </Card>
        )}

        {matches.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600">No matches found for this user</p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
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
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opponent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matches.map((match) => (
                    <tr key={match.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {match.date ? format(new Date(match.date), 'MMM d, yyyy') : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {match.court?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded capitalize bg-gray-100 text-gray-800">
                          {match.format || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(match.status || 'pending')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {getUserRole(match)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {getOpponentInfo(match)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/matches/${match.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}

