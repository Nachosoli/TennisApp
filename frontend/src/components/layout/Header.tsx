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
                <img 
                  src="/logo.png" 
                  alt="CourtBuddy Logo" 
                  className="h-8 w-auto"
                />
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

