'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { courtsApi } from '@/lib/courts';
import { reviewsApi, CourtReview, CourtReviewStats } from '@/lib/reviews';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { GoogleMap } from '@/components/GoogleMap';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Court } from '@/types';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import { sanitizeText } from '@/lib/sanitize';

function CourtDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading, user } = useRequireAuth();
  const courtId = params.id as string;
  const [court, setCourt] = useState<Court | null>(null);
  const [reviews, setReviews] = useState<CourtReview[]>([]);
  const [stats, setStats] = useState<CourtReviewStats | null>(null);
  const [userReview, setUserReview] = useState<CourtReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (courtId && user) {
      loadCourtData();
    }
  }, [courtId, user]);

  const loadCourtData = async () => {
    try {
      setIsLoading(true);
      const [courtData, reviewsData, statsData, userReviewData] = await Promise.all([
        courtsApi.getById(courtId),
        reviewsApi.getReviewsByCourt(courtId),
        reviewsApi.getCourtStats(courtId),
        reviewsApi.getUserReview(courtId),
      ]);
      setCourt(courtData);
      setReviews(reviewsData);
      setStats(statsData);
      setUserReview(userReviewData);
      if (userReviewData) {
        setReviewRating(userReviewData.rating);
        setReviewComment(userReviewData.comment || '');
      }
    } catch (error) {
      console.error('Failed to load court data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !courtId) return;

    try {
      setIsSubmitting(true);
      await reviewsApi.createReview(courtId, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      await loadCourtData();
      setShowReviewForm(false);
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete your review?')) return;

    try {
      await reviewsApi.deleteReview(courtId, reviewId);
      await loadCourtData();
    } catch (error) {
      console.error('Failed to delete review:', error);
      alert('Failed to delete review. Please try again.');
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user) {
    return null; // Redirect handled by useRequireAuth
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
            {stats && stats.count > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={stats.average} readonly size="sm" />
                <span className="text-sm text-gray-600">
                  {stats.average.toFixed(1)} ({stats.count} {stats.count === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}
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

        <Card title="Court Information">
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Surface:</span>{' '}
              <span className={`px-2 py-1 rounded text-sm ${
                court.surface?.toLowerCase() === 'hard' ? 'bg-blue-100 text-blue-800' :
                court.surface?.toLowerCase() === 'clay' ? 'bg-orange-100 text-orange-800' :
                court.surface?.toLowerCase() === 'grass' ? 'bg-green-100 text-green-800' :
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

        <Card title="Reviews">
          <div className="space-y-6">
            {!userReview && !showReviewForm && (
              <Button
                variant="primary"
                onClick={() => setShowReviewForm(true)}
                className="w-full sm:w-auto"
              >
                Write a Review
              </Button>
            )}

            {showReviewForm && (
              <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <StarRating
                    rating={reviewRating}
                    onRatingChange={setReviewRating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience at this court..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {reviewComment.length}/2000 characters
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={handleSubmitReview}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowReviewForm(false);
                      if (userReview) {
                        setReviewRating(userReview.rating);
                        setReviewComment(userReview.comment || '');
                      } else {
                        setReviewRating(5);
                        setReviewComment('');
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {userReview && !showReviewForm && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating rating={userReview.rating} readonly size="sm" />
                      <span className="text-sm font-medium text-gray-700">Your Review</span>
                    </div>
                    {userReview.comment && (
                      <p className="text-gray-700 whitespace-pre-wrap">{sanitizeText(userReview.comment)}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(userReview.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowReviewForm(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteReview(userReview.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                All Reviews ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No reviews yet. Be the first to review this court!</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {review.user
                            ? `${sanitizeText(review.user.firstName)} ${sanitizeText(review.user.lastName)}`
                            : 'Anonymous'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <StarRating rating={review.rating} readonly size="sm" />
                    </div>
                    {review.comment && (
                      <p className="text-gray-700 whitespace-pre-wrap mt-2">
                        {sanitizeText(review.comment)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

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
