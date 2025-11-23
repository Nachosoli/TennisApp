'use client';

import { useEffect, useState } from 'react';
import { applicationsApi } from '@/lib/applications';
import { Application } from '@/types';
import { socketService } from '@/lib/socket';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Skeleton } from './ui/Skeleton';
import { format } from 'date-fns';

interface ApplicationManagerProps {
  matchId: string;
}

export const ApplicationManager = ({ matchId }: ApplicationManagerProps) => {
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm application');
      console.error('Failed to confirm application:', err);
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <Skeleton variant="rectangular" height={20} width="40%" className="mb-2" />
                <Skeleton variant="rectangular" height={16} width="60%" />
              </div>
              <Skeleton variant="rectangular" height={32} width={80} />
            </div>
          </Card>
        ))}
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
      <div className="text-center py-4 text-gray-600">
        <p>No applications yet</p>
        <p className="text-sm mt-2">Players who apply to join this match will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((application) => (
        <Card key={application.id} className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-gray-900">
                  {application.user?.firstName} {application.user?.lastName}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${
                  application.status?.toLowerCase() === 'confirmed' ? 'bg-green-100 text-green-800' :
                  application.status?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' :
                  application.status?.toLowerCase() === 'waitlisted' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {application.status}
                </span>
              </div>
              {application.guestPartnerName && (
                <p className="text-sm text-gray-600 mb-1">
                  Guest partner: {application.guestPartnerName}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Applied: {format(new Date(application.createdAt), 'MMM dd, h:mm a')}
              </p>
              {application.matchSlot && (
                <p className="text-sm text-gray-700 mt-2">
                  Slot: {format(new Date(application.matchSlot.startTime), 'h:mm a')} - {format(new Date(application.matchSlot.endTime), 'h:mm a')}
                </p>
              )}
            </div>
            {(application.status?.toLowerCase() === 'pending' || application.status?.toLowerCase() === 'waitlisted') && (
              <div className="flex gap-2 ml-4">
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
          </div>
        </Card>
      ))}
    </div>
  );
};

