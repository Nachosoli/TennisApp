'use client';

import { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { usersApi } from '@/lib/users';
import { useAuthStore } from '@/stores/auth-store';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onUploadComplete?: (photoUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function PhotoUpload({ currentPhotoUrl, onUploadComplete, size = 'md' }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setUser } = useAuthStore();

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const updatedUser = await usersApi.uploadPhoto(file);
      setUser(updatedUser);
      const photoUrl = updatedUser.photoUrl || '';
      setPreview(photoUrl);
      onUploadComplete?.(photoUrl);
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Photo upload error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to upload photo. Please try again.';
      setError(errorMessage);
      setPreview(currentPhotoUrl || null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100`}>
        {preview ? (
          <img
            src={preview}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : currentPhotoUrl ? 'Change Photo' : 'Upload Photo'}
        </Button>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <p className="text-xs text-gray-500">JPEG, PNG, or WebP (max 5MB)</p>
      </div>
    </div>
  );
}

