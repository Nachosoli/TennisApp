'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { NotificationBell } from '@/components/NotificationBell';
import { Button } from '@/components/ui/Button';
import { UserDropdown } from './UserDropdown';
import { NavigationBar } from './NavigationBar';

export const Header = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center space-x-2 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      {/* Tennis court rectangle - very clear */}
                      <rect x="2" y="4" width="20" height="14" rx="1.5" fill="white" fillOpacity="0.15"/>
                      <rect x="2" y="4" width="20" height="14" rx="1.5"/>
                      {/* Center net line - prominent */}
                      <line x1="12" y1="4" x2="12" y2="18" strokeWidth={3}/>
                      {/* Service boxes - clear T shape */}
                      <line x1="2" y1="8" x2="22" y2="8"/>
                      <line x1="2" y1="14" x2="22" y2="14"/>
                      <line x1="6.5" y1="4" x2="6.5" y2="18"/>
                      <line x1="17.5" y1="4" x2="17.5" y2="18"/>
                      <line x1="6.5" y1="11" x2="17.5" y2="11"/>
                    </svg>
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                  CourtBuddy
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
              {isAuthenticated ? (
                <>
                  <NotificationBell />
                  <UserDropdown />
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm min-h-[44px] px-3 sm:px-4">Login</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button variant="primary" size="sm" className="text-xs sm:text-sm min-h-[44px] px-3 sm:px-4">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <NavigationBar />
    </>
  );
};

