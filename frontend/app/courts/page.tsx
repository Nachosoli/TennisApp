'use client';

import { useEffect, useState } from 'react';
import { courtsApi } from '@/lib/courts';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GoogleMap } from '@/components/GoogleMap';
import { Court } from '@/types';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';

function CourtsPageContent() {
  const { isLoading: authLoading, user } = useRequireAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      courtsApi.getAll().then((data) => {
        setCourts(data);
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
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

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Courts</h1>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : courts.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-600">No courts found</p>
          </Card>
        ) : (
          <>
            {courts.length > 0 && (
              <Card title="Court Locations" className="mb-6">
                <GoogleMap
                  courts={courts}
                  height="400px"
                  showCurrentLocation={true}
                />
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courts.map((court) => (
                <Card key={court.id} className="hover:shadow-lg transition-shadow">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{court.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{court.address}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-1 rounded ${
                        court.surface?.toLowerCase() === 'hard' ? 'bg-blue-100 text-blue-800' :
                        court.surface?.toLowerCase() === 'clay' ? 'bg-orange-100 text-orange-800' :
                        court.surface?.toLowerCase() === 'grass' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {court.surface}
                      </span>
                      <span className={`px-2 py-1 rounded ${
                        court.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {court.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default function CourtsPage() {
  return (
    <ErrorBoundary>
      <CourtsPageContent />
    </ErrorBoundary>
  );
}
