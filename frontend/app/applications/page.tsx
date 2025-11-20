'use client';

import { useEffect, useState } from 'react';
import { applicationsApi } from '@/lib/applications';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Application } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';

export default function ApplicationsPage() {
  const { isLoading: authLoading, user } = useRequireAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      applicationsApi.getMyApplications()
        .then(setApplications)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [user]);

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

  const handleConfirm = async (id: string) => {
    try {
      await applicationsApi.confirm(id);
      setApplications((apps) =>
        apps.map((app) => (app.id === id ? { ...app, status: 'CONFIRMED' as const } : app))
      );
    } catch (error) {
      console.error('Failed to confirm:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await applicationsApi.reject(id);
      setApplications((apps) =>
        apps.map((app) => (app.id === id ? { ...app, status: 'REJECTED' as const } : app))
      );
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-600 mb-4">No applications found</p>
            <Link href="/matches">
              <Button variant="primary">Browse Matches</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <Card key={application.id}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {application.matchSlot?.match?.court?.name || 'Match'}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        application.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        application.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        application.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {application.status}
                      </span>
                    </div>
                    {application.matchSlot && (
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Date:</span>{' '}
                          {format(new Date(application.matchSlot.match?.date || ''), 'MMM dd, yyyy')}
                        </p>
                        <p>
                          <span className="font-medium">Time:</span>{' '}
                          {format(new Date(application.matchSlot.startTime), 'h:mm a')} -{' '}
                          {format(new Date(application.matchSlot.endTime), 'h:mm a')}
                        </p>
                        {application.guestPartnerName && (
                          <p>
                            <span className="font-medium">Guest Partner:</span>{' '}
                            {application.guestPartnerName}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Applied:</span>{' '}
                          {format(new Date(application.createdAt), 'MMM dd, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {application.matchSlot?.match && (
                      <Link href={`/matches/${application.matchSlot.match.id}`}>
                        <Button variant="outline" size="sm">View Match</Button>
                      </Link>
                    )}
                    {application.status === 'PENDING' && application.matchSlot?.match?.creatorUserId && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

