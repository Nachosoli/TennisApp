'use client';

import { useEffect, useState } from 'react';
import { applicationsApi } from '@/lib/applications';
import { Application } from '@/types';
import { socketService } from '@/lib/socket';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import { format } from 'date-fns';

interface ApplicationsTableProps {
  matchId: string;
  matchFormat?: 'singles' | 'doubles';
  matchStatus?: string;
  onApplicationConfirmed?: () => void;
}

export const ApplicationsTable = ({ matchId, matchFormat = 'singles', matchStatus, onApplicationConfirmed }: ApplicationsTableProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();

    // Listen for application updates via socket
    const handleApplicationUpdate = () => {
      loadApplications();
    };

    socketService.onApplicationUpdate(handleApplicationUpdate);

    return () => {
      socketService.offApplicationUpdate(handleApplicationUpdate);
    };
  }, [matchId]);

  const loadApplications = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const data = await applicationsApi.getMatchApplications(matchId);
      setApplications(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load applications');
      console.error('Failed to load applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (applicationId: string) => {
    try {
      setError(null);
      await applicationsApi.confirm(applicationId);
      await loadApplications();
      onApplicationConfirmed?.(); // Refresh match data to show chat box
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm application');
      console.error('Failed to confirm application:', err);
    }
  };

  const handleApproveFromWaitlist = async (applicationId: string) => {
    try {
      setError(null);
      await applicationsApi.approveFromWaitlist(applicationId);
      await loadApplications();
      onApplicationConfirmed?.(); // Refresh match data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve from waitlist');
      console.error('Failed to approve from waitlist:', err);
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      setError(null);
      await applicationsApi.reject(applicationId);
      await loadApplications();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject application');
      console.error('Failed to reject application:', err);
    }
  };

  const formatRating = (user: any): string => {
    if (user?.ratingValue && user?.ratingType) {
      return `${user.ratingValue} (${user.ratingType})`;
    }
    return 'N/A';
  };

  const formatElo = (user: any): string => {
    if (!user?.stats) return 'N/A';
    const elo = matchFormat === 'doubles' ? user.stats.doublesElo : user.stats.singlesElo;
    return elo ? Math.round(elo).toString() : 'N/A';
  };

  const formatWinRate = (user: any): string => {
    if (!user?.stats || !user.stats.totalMatches || user.stats.totalMatches === 0) {
      return '0%';
    }
    const winRate = (user.stats.totalWins / user.stats.totalMatches) * 100;
    return `${winRate.toFixed(1)}%`;
  };

  const formatCancellationRate = (user: any): string => {
    if (!user?.stats || !user.stats.totalMatches || user.stats.totalMatches === 0) {
      return '0%';
    }
    const cancelledMatches = user.stats.cancelledMatches || 0;
    const cancellationRate = (cancelledMatches / user.stats.totalMatches) * 100;
    return `${cancellationRate.toFixed(1)}%`;
  };

  const formatSlotTime = (timeString: string | undefined): string => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const minute = minutes ? parseInt(minutes, 10) : 0;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeString;
    }
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Slot</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Elo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancellation Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: 3 }).map((_, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap"><Skeleton variant="rectangular" height={16} width="60%" /></td>
                <td className="px-6 py-4 whitespace-nowrap"><Skeleton variant="rectangular" height={16} width="60%" /></td>
                <td className="px-6 py-4 whitespace-nowrap"><Skeleton variant="rectangular" height={16} width="50%" /></td>
                <td className="px-6 py-4 whitespace-nowrap"><Skeleton variant="rectangular" height={16} width="40%" /></td>
                <td className="px-6 py-4 whitespace-nowrap"><Skeleton variant="rectangular" height={16} width="40%" /></td>
                <td className="px-6 py-4 whitespace-nowrap"><Skeleton variant="rectangular" height={16} width="40%" /></td>
                <td className="px-6 py-4 whitespace-nowrap"><Skeleton variant="rectangular" height={16} width="40%" /></td>
                <td className="px-6 py-4 whitespace-nowrap"><Skeleton variant="rectangular" height={16} width="50%" /></td>
                <td className="px-6 py-4 whitespace-nowrap"><Skeleton variant="rectangular" height={32} width={80} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p className="font-medium">No applications yet</p>
        <p className="text-sm mt-2">Players who apply to join this match will appear here.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {applications.map((application) => {
          const user = application.user || application.applicant;
          if (!user) return null;

          return (
            <div key={application.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {application.matchSlot && (
                      <div>
                        <span className="font-medium">Time:</span> {formatSlotTime(application.matchSlot.startTime)} - {formatSlotTime(application.matchSlot.endTime)}
                      </div>
                    )}
                    {formatRating(user) && (
                      <div>
                        <span className="font-medium">Rating:</span> {formatRating(user)}
                      </div>
                    )}
                    {formatElo(user) && (
                      <div>
                        <span className="font-medium">ELO:</span> {formatElo(user)}
                      </div>
                    )}
                    {formatWinRate(user) && (
                      <div>
                        <span className="font-medium">Win Rate:</span> {formatWinRate(user)}
                      </div>
                    )}
                    {formatCancellationRate(user) && (
                      <div>
                        <span className="font-medium">Cancellation Rate:</span> {formatCancellationRate(user)}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  application.status?.toLowerCase() === 'confirmed' ? 'bg-green-100 text-green-800' :
                  application.status?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' :
                  application.status?.toLowerCase() === 'waitlisted' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {application.status}
                </span>
              </div>
              {(application.status?.toLowerCase() === 'pending' || 
                (application.status?.toLowerCase() === 'waitlisted' && matchStatus?.toLowerCase() === 'pending' && matchFormat === 'singles')) && (
                <div className="flex flex-row gap-2 pt-2 border-t border-gray-200">
                  {application.status?.toLowerCase() === 'pending' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleConfirm(application.id)}
                        className="flex-1"
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(application.id)}
                        className="flex-1"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {application.status?.toLowerCase() === 'waitlisted' && matchStatus?.toLowerCase() === 'pending' && matchFormat === 'singles' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveFromWaitlist(application.id)}
                        className="flex-1"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(application.id)}
                        className="flex-1"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Slot</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Elo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancellation Rate</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((application) => {
            const user = application.user || application.applicant;
            if (!user) return null;

            return (
              <tr key={application.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.firstName || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastName || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {application.matchSlot 
                    ? `${formatSlotTime(application.matchSlot.startTime)} - ${formatSlotTime(application.matchSlot.endTime)}`
                    : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatRating(user)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatElo(user)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatWinRate(user)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCancellationRate(user)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    application.status?.toLowerCase() === 'confirmed' ? 'bg-green-100 text-green-800' :
                    application.status?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' :
                    application.status?.toLowerCase() === 'waitlisted' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {application.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {application.status?.toLowerCase() === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleConfirm(application.id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(application.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {application.status?.toLowerCase() === 'waitlisted' && matchStatus?.toLowerCase() === 'pending' && matchFormat === 'singles' && (
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveFromWaitlist(application.id)}
                      >
                        Approve from Waitlist
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(application.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {application.status?.toLowerCase() === 'waitlisted' && matchStatus?.toLowerCase() !== 'pending' && (
                    <span className="text-xs text-gray-500">Waitlisted</span>
                  )}
                  {application.status?.toLowerCase() !== 'pending' && application.status?.toLowerCase() !== 'waitlisted' && (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
};

