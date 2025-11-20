'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { PageLoader } from '@/components/ui/PageLoader';
import { adminApi } from '@/lib/admin';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User } from '@/types';
import { format } from 'date-fns';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading, user: currentUser, isAdmin } = useRequireAdmin();
  const userId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'admin') {
      router.push('/');
      return;
    }

    setIsLoading(true);
    adminApi.getUserById(userId)
      .then(setUser)
      .catch((err) => {
        console.error('Failed to load user:', err);
      })
      .finally(() => setIsLoading(false));
  }, [userId, currentUser?.id, currentUser?.role]); // Only depend on user ID and role

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    
    setIsSuspending(true);
    try {
      const updatedUser = await adminApi.suspendUser(userId, {
        reason: suspendReason,
      });
      setUser(updatedUser);
      setShowSuspendModal(false);
      setSuspendReason('');
    } catch (error) {
      console.error('Failed to suspend user:', error);
    } finally {
      setIsSuspending(false);
    }
  };

  const handleBan = async () => {
    if (!banReason.trim()) return;
    
    setIsBanning(true);
    try {
      const updatedUser = await adminApi.banUser(userId, banReason);
      setUser(updatedUser);
      setShowBanModal(false);
      setBanReason('');
    } catch (error) {
      console.error('Failed to ban user:', error);
    } finally {
      setIsBanning(false);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return null;
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">User not found</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            Go Back
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
            <h1 className="text-3xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600 mt-1">{user.email}</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Back to Users
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="User Information">
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Name:</span>{' '}
                <span className="text-gray-900">{user.firstName} {user.lastName}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>{' '}
                <span className="text-gray-900">{user.email}</span>
              </div>
              {user.phone && (
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>{' '}
                  <span className="text-gray-900">{user.phone}</span>
                  {user.phoneVerified && (
                    <span className="ml-2 text-xs text-green-600">✓ Verified</span>
                  )}
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Role:</span>{' '}
                <span className={`px-2 py-1 rounded text-sm ${
                  user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.role}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>{' '}
                <span className={`px-2 py-1 rounded text-sm ${
                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {user.ratingType && (
                <div>
                  <span className="font-medium text-gray-700">Rating:</span>{' '}
                  <span className="text-gray-900">
                    {user.ratingType} {user.ratingValue}
                  </span>
                </div>
              )}
              {user.bio && (
                <div>
                  <span className="font-medium text-gray-700">Bio:</span>
                  <p className="text-gray-900 mt-1">{user.bio}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Member Since:</span>{' '}
                <span className="text-gray-900">
                  {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          <Card title="Actions">
            <div className="space-y-3">
              {user.isActive && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowSuspendModal(true)}
                  >
                    Suspend User
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full !border-red-300 !text-red-600 hover:!bg-red-50"
                    onClick={() => setShowBanModal(true)}
                  >
                    Ban User
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/admin/users/${userId}/edit`)}
              >
                Edit User
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/stats/users/${userId}`)}
              >
                View Stats
              </Button>
            </div>
          </Card>
        </div>

        {/* Suspend Modal */}
        {showSuspendModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Suspend User</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for suspension
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={4}
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Enter reason for suspension..."
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleSuspend}
                    disabled={isSuspending || !suspendReason.trim()}
                  >
                    {isSuspending ? 'Suspending...' : 'Suspend'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowSuspendModal(false);
                      setSuspendReason('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Ban Modal */}
        {showBanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4 text-red-600">Ban User</h2>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  This action cannot be undone. The user will be permanently banned.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for ban
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={4}
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Enter reason for ban..."
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    className="flex-1 !bg-red-600 hover:!bg-red-700"
                    onClick={handleBan}
                    disabled={isBanning || !banReason.trim()}
                  >
                    {isBanning ? 'Banning...' : 'Ban User'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowBanModal(false);
                      setBanReason('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

