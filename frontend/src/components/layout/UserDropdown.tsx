'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors min-h-[44px]"
      >
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* User Avatar */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
            {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="hidden sm:inline">
            {user.firstName} {user.lastName}
          </span>
        </div>
        {/* Dropdown Icon */}
        <svg
          className={`w-4 h-4 transition-transform hidden sm:block ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop - iOS-compatible rgba for better transparency rendering */}
          <div
            className="fixed inset-0 z-40 sm:bg-transparent"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-1/2 sm:right-0 translate-x-1/2 sm:translate-x-0 mt-2 w-[calc(100vw-2rem)] sm:w-56 max-w-sm rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>

            {/* Profile */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors min-h-[44px] flex items-center"
              role="menuitem"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </div>
            </Link>

            {/* Settings */}
            <div className="border-t border-gray-200 my-1"></div>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors min-h-[44px] flex items-center"
              role="menuitem"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </div>
            </Link>

            {/* Admin (if admin) */}
            {isAdmin && (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors min-h-[44px] flex items-center"
                  role="menuitem"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Admin</span>
                  </div>
                </Link>
              </>
            )}

            {/* Logout */}
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors min-h-[44px] flex items-center"
              role="menuitem"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </div>
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

