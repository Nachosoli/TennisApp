'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { PageLoader } from '@/components/ui/PageLoader';
import { adminApi } from '@/lib/admin';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Court } from '@/types';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { courtsApi } from '@/lib/courts';
import { useLoadScript } from '@react-google-maps/api';
import { getErrorMessage } from '@/lib/errors';

export default function AdminCourtsPage() {
  const router = useRouter();
  const { isLoading: authLoading, user, isAdmin } = useRequireAdmin();
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    surface: 'hard' as 'hard' | 'clay' | 'grass' | 'indoor',
    isPublic: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = 50;

  // Court creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [courtName, setCourtName] = useState('');
  const [courtAddress, setCourtAddress] = useState('');
  const [courtSurface, setCourtSurface] = useState<'hard' | 'clay' | 'grass' | 'indoor'>('hard');
  const [courtIsPublic, setCourtIsPublic] = useState(true);
  const [isCreatingCourt, setIsCreatingCourt] = useState(false);
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<google.maps.places.PlaceResult | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Google Maps - useLoadScript must be called unconditionally
  const googleMapsApiKey = useMemo(() => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', []);
  const { isLoaded: isGoogleMapsLoaded } = useLoadScript({
    googleMapsApiKey,
    libraries: ['places'],
  });

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (isGoogleMapsLoaded && addressInputRef.current && googleMapsApiKey && !autocompleteRef.current && showCreateForm) {
      try {
        const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
          types: ['establishment'],
          fields: ['geometry', 'formatted_address', 'name', 'place_id'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place && place.geometry) {
            setSelectedGooglePlace(place);
            setCourtAddress(place.formatted_address || '');
          }
        });

        autocompleteRef.current = autocomplete;
      } catch (error) {
        console.error('Failed to initialize Google Places Autocomplete:', error);
      }
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isGoogleMapsLoaded, googleMapsApiKey, showCreateForm]);

  const loadCourts = () => {
    if (!user || !isAdmin) {
      return;
    }

    setIsLoading(true);
    setError(null);
    adminApi.getAllCourts(page, limit, search || undefined)
      .then((data) => {
        setCourts(data.courts);
        setTotal(data.total);
      })
      .catch((err) => {
        console.error('Failed to load courts:', err);
        setError('Failed to load courts. Please try again.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCourts();
  }, [user?.id, isAdmin, page, search]);

  const handleEdit = (court: Court) => {
    setEditingCourt(court);
    setEditForm({
      name: court.name,
      address: court.address,
      surface: court.surface || 'hard',
      isPublic: court.isPublic ?? true,
    });
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingCourt(null);
    setEditForm({
      name: '',
      address: '',
      surface: 'hard',
      isPublic: true,
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!editingCourt) return;

    setIsSaving(true);
    setError(null);

    try {
      // Transform frontend format to backend format
      const updateData: any = {
        name: editForm.name,
        address: editForm.address,
        surfaceType: editForm.surface, // Backend expects surfaceType
        isPublic: editForm.isPublic,
      };

      await adminApi.editCourt(editingCourt.id, updateData);
      
      // Reload courts to get updated data
      await loadCourts();
      setEditingCourt(null);
    } catch (err: any) {
      console.error('Failed to update court:', err);
      setError(err.response?.data?.message || 'Failed to update court. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCourt = async () => {
    if (!courtName.trim() || !courtAddress.trim() || !selectedGooglePlace) {
      setError('Please fill in all fields and select an address from the suggestions');
      return;
    }

    setIsCreatingCourt(true);
    setError(null);

    try {
      const location = selectedGooglePlace.geometry?.location;
      if (!location) {
        throw new Error('Invalid address location');
      }

      // Create the court (or get existing one if it already exists)
      await courtsApi.create({
        name: courtName.trim(),
        address: courtAddress,
        lat: location.lat(),
        lng: location.lng(),
        surface: courtSurface,
        isPublic: courtIsPublic,
      });

      // Reset form
      setCourtName('');
      setCourtAddress('');
      setCourtSurface('hard');
      setCourtIsPublic(true);
      setSelectedGooglePlace(null);
      setShowCreateForm(false);

      // Reload courts to show the new one
      await loadCourts();
    } catch (err: any) {
      console.error('Failed to create court:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsCreatingCourt(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCourtName('');
    setCourtAddress('');
    setCourtSurface('hard');
    setCourtIsPublic(true);
    setSelectedGooglePlace(null);
    setError(null);
    
    // Clear autocomplete
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Court Management</h1>
          <div className="flex gap-2">
            {!showCreateForm && (
              <Button variant="primary" onClick={() => setShowCreateForm(true)}>
                Create New Court
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push('/admin')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          </Card>
        )}

        {/* Create Court Form */}
        {showCreateForm && (
          <Card>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Create New Court</h2>
                <Button variant="outline" size="sm" onClick={handleCancelCreate}>
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Court Name *"
                  type="text"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  placeholder="Enter court name"
                  required
                />

                <Input
                  ref={addressInputRef}
                  label="Address *"
                  type="text"
                  value={courtAddress}
                  onChange={(e) => setCourtAddress(e.target.value)}
                  placeholder={isGoogleMapsLoaded ? "Search for an address..." : "Enter address"}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Surface Type *
                  </label>
                  <select
                    value={courtSurface}
                    onChange={(e) => setCourtSurface(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="hard">Hard</option>
                    <option value="clay">Clay</option>
                    <option value="grass">Grass</option>
                    <option value="indoor">Indoor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Court Type *
                  </label>
                  <select
                    value={courtIsPublic ? 'public' : 'private'}
                    onChange={(e) => setCourtIsPublic(e.target.value === 'public')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelCreate} disabled={isCreatingCourt}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateCourt}
                  isLoading={isCreatingCourt}
                  disabled={!courtName.trim() || !courtAddress.trim() || !selectedGooglePlace || isCreatingCourt}
                >
                  Create Court
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Search */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="Search by name or address..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading courts...</p>
          </div>
        ) : (
          <>
            <Card>
              <div className="mb-4 text-sm text-gray-600">
                Showing {courts.length} of {total} courts
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Surface
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courts.map((court) => (
                      <tr key={court.id} className="hover:bg-gray-50">
                        {editingCourt?.id === court.id ? (
                          // Edit Mode
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <Input
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                className="w-full"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={editForm.surface}
                                onChange={(e) => setEditForm({ ...editForm, surface: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="hard">Hard</option>
                                <option value="clay">Clay</option>
                                <option value="grass">Grass</option>
                                <option value="indoor">Indoor</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={editForm.isPublic ? 'public' : 'private'}
                                onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.value === 'public' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {court.createdAt ? format(new Date(court.createdAt), 'MMM d, yyyy') : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={handleSave}
                                  disabled={isSaving}
                                >
                                  {isSaving ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  disabled={isSaving}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          // View Mode
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {court.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500">{court.address}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded capitalize ${
                                court.surface === 'clay' 
                                  ? 'bg-green-100 text-green-800'
                                  : court.surface === 'grass'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : court.surface === 'hard'
                                  ? 'bg-blue-100 text-blue-800'
                                  : court.surface === 'indoor'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {court.surface || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded ${
                                court.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {court.isPublic ? 'Public' : 'Private'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {court.createdAt ? format(new Date(court.createdAt), 'MMM d, yyyy') : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(court)}
                              >
                                Edit
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
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
      </div>
    </Layout>
  );
}
