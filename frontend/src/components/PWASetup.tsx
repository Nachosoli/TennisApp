'use client';

import { useEffect, useState } from 'react';
import { pushNotificationService } from '@/lib/push-notifications';

export function PWASetup() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (typeof window !== 'undefined') {
      // Check if running as standalone (installed)
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsInstalled(true);
      }

      // Initialize PWA features
      const initPWA = async () => {
        // Register service worker and initialize push notifications
        try {
          const initialized = await pushNotificationService.initialize();
          if (initialized) {
            console.log('[PWA] Service worker and push notifications initialized');
            
            // Request permission and subscribe if not already subscribed
            const isSubscribed = await pushNotificationService.isSubscribed();
            if (!isSubscribed) {
              const permission = await pushNotificationService.requestPermission();
              if (permission === 'granted') {
                const subscription = await pushNotificationService.subscribe();
                if (subscription) {
                  // Send subscription to backend
                  try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
                    const response = await fetch(`${apiUrl}/api/v1/notifications/push-subscription`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                      },
                      credentials: 'include',
                      body: JSON.stringify(subscription),
                    });
                    if (response.ok) {
                      console.log('[PWA] Push subscription sent to backend');
                    } else {
                      console.warn('[PWA] Failed to send subscription to backend:', await response.text());
                    }
                  } catch (err) {
                    console.warn('[PWA] Failed to send subscription to backend:', err);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn('[PWA] Failed to initialize:', error);
        }

        // Handle install prompt
        let deferredPrompt: any;

        const handleBeforeInstallPrompt = (e: Event) => {
          e.preventDefault();
          deferredPrompt = e;
          setShowInstallPrompt(true);
          // Store for later use
          (window as any).deferredPrompt = deferredPrompt;
        };

        const handleAppInstalled = () => {
          console.log('[PWA] App installed');
          setIsInstalled(true);
          setShowInstallPrompt(false);
          deferredPrompt = null;
          (window as any).deferredPrompt = null;
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          window.removeEventListener('appinstalled', handleAppInstalled);
        };
      };

      initPWA();
    }
  }, []);

  const handleInstallClick = async () => {
    const deferredPrompt = (window as any).deferredPrompt;
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install prompt');
    } else {
      console.log('[PWA] User dismissed install prompt');
    }

    setShowInstallPrompt(false);
    (window as any).deferredPrompt = null;
  };

  // Optional: Show install button UI (can be customized)
  if (showInstallPrompt && !isInstalled) {
    // You can return a component here to show install button
    // For now, we'll just log it
    console.log('[PWA] Install prompt available');
  }

  return null;
}

