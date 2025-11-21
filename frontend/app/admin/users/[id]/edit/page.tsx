'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { PageLoader } from '@/components/ui/PageLoader';
import { adminApi } from '@/lib/admin';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User } from '@/types';
import { getErrorMessage } from '@/lib/errors';

const editUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email').optional(),
  ratingType: z.enum(['utr', 'usta', 'ultimate', 'custom']).optional().or(z.literal('')),
  ratingValue: z.number().min(0).max(12, 'Rating must be between 0 and 12').optional(),
  isActive: z.boolean().optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

export default function AdminEditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading, user: currentUser, isAdmin } = useRequireAdmin();
  const userId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
  });

  useEffect(() => {
    if (!currentUser) return;
    
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'admin') {
      router.push('/');
      return;
    }

    setIsLoading(true);
    adminApi.getUserById(userId)
      .then((userData) => {
        setUser(userData);
        reset({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          ratingType: userData.ratingType || '',
          ratingValue: userData.ratingValue,
          isActive: userData.isActive ?? true,
        });
      })
      .catch((err) => {
        console.error('Failed to load user:', err);
        setError('Failed to load user details');
      })
      .finally(() => setIsLoading(false));
  }, [userId, currentUser?.id, currentUser?.role, reset, router]);

  const onSubmit = async (data: EditUserFormData) => {
    setIsSaving(true);
    setError(null);
    
    try {
      // Filter out empty strings and undefined values
      const updateData: Partial<User> = {};
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.ratingType !== undefined && data.ratingType !== '') updateData.ratingType = data.ratingType as any;
      if (data.ratingValue !== undefined) updateData.ratingValue = data.ratingValue;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const updatedUser = await adminApi.editUser(userId, updateData);
      setUser(updatedUser);
      router.push(`/admin/users/${userId}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReason.trim()) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await adminApi.deleteUser(userId, deleteReason);
      router.push('/admin/users');
    } catch (err) {
      setError(getErrorMessage(err));
      setIsDeleting(false);
    }
  };

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'admin') {
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <Layout>
        <PageLoader />
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Player</h1>
            <p className="text-gray-600 mt-1">{user.firstName} {user.lastName}</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>

        <Card title="Player Information">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                {...register('firstName')}
                error={errors.firstName?.message}
              />
              <Input
                label="Last Name"
                {...register('lastName')}
                error={errors.lastName?.message}
              />
            </div>

            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Rating Type
                </label>
                <select
                  {...register('ratingType')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Select rating type</option>
                  <option value="utr">UTR</option>
                  <option value="usta">USTA</option>
                  <option value="ultimate">Ultimate</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Rating Value
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="12"
                  {...register('ratingValue', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
                {errors.ratingValue && (
                  <p className="mt-1.5 text-sm font-medium text-red-700">{errors.ratingValue.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-900">Active</span>
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Danger Zone">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Deleting a player will permanently remove their account and all associated data. This action cannot be undone.
              </p>
              <Button
                variant="outline"
                className="w-full !border-red-300 !text-red-600 hover:!bg-red-50"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Player
              </Button>
            </div>
          </div>
        </Card>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4 text-red-600">Delete Player</h2>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  This action cannot be undone. The player account and all associated data will be permanently deleted.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for deletion
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={4}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Enter reason for deletion..."
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    className="flex-1 !bg-red-600 hover:!bg-red-700"
                    onClick={handleDelete}
                    disabled={isDeleting || !deleteReason.trim()}
                    isLoading={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Player'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteReason('');
                    }}
                    disabled={isDeleting}
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

