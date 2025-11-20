'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { courtsApi } from '@/lib/courts';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GoogleMap } from '@/components/GoogleMap';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Court } from '@/types';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';

function CourtDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading, user } = useRequireAuth();
  const courtId = params.id as string;
  const [court, setCourt] = useState<Court | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (courtId && user) {
      courtsApi.getById(courtId)
        .then(setCourt)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [courtId, user]);

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

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading court details...</p>
        </div>
      </Layout>
    );
  }

  if (!court) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Court not found</p>
          <Button variant="outline" onClick={() => router.push('/courts')} className="mt-4">
            Back to Courts
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{court.name}</h1>
            <p className="text-gray-600 mt-1">{court.address}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            court.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {court.isPublic ? 'Public' : 'Private'}
          </span>
        </div>

        {court.location && (
          <Card title="Location">
            <GoogleMap
              courts={[court]}
              center={{
                lat: court.location.coordinates[1],
                lng: court.location.coordinates[0],
              }}
              zoom={15}
              height="400px"
              selectedCourtId={court.id}
            />
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Court Information">
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Surface:</span>{' '}
                <span className={`px-2 py-1 rounded text-sm ${
                  court.surface === 'HARD' ? 'bg-blue-100 text-blue-800' :
                  court.surface === 'CLAY' ? 'bg-orange-100 text-orange-800' :
                  court.surface === 'GRASS' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {court.surface}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Type:</span>{' '}
                <span className="text-gray-900">{court.isPublic ? 'Public' : 'Private'}</span>
              </div>
              {court.location && (
                <div>
                  <span className="font-medium text-gray-700">Coordinates:</span>{' '}
                  <span className="text-gray-900 text-sm">
                    {court.location.coordinates[1].toFixed(4)}, {court.location.coordinates[0].toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card title="Actions">
            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push(`/matches/create?courtId=${court.id}`)}
              >
                Create Match Here
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/matches?courtId=${court.id}`)}
              >
                View Matches at This Court
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function CourtDetailPage() {
  return (
    <ErrorBoundary>
      <CourtDetailPageContent />
    </ErrorBoundary>
  );
}
