'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { notificationsApi } from '@/lib/notifications';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NotificationPreference } from '@/types';
import { PageLoader } from '@/components/ui/PageLoader';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type NotificationType = 'match_created' | 'match_accepted' | 'match_applicant' | 'match_confirmed' | 'court_changes' | 'score_reminder' | 'new_chat';

const NOTIFICATION_TYPES: { type: NotificationType; label: string; description: string }[] = [
  {
    type: 'match_created',
    label: 'Match Created',
    description: 'When a new match is created that matches your preferences',
  },
  {
    type: 'match_accepted',
    label: 'Match Accepted',
    description: 'When your application to join a match is accepted',
  },
  {
    type: 'match_applicant',
    label: 'Match Applicants',
    description: 'When someone applies to your match',
  },
  {
    type: 'match_confirmed',
    label: 'Match Confirmed',
    description: 'When a match you\'re participating in is confirmed',
  },
  {
    type: 'court_changes',
    label: 'Court Changes',
    description: 'When there are changes to a court or match location',
  },
  {
    type: 'score_reminder',
    label: 'Score Reminder',
    description: 'Reminders to submit match scores',
  },
  {
    type: 'new_chat',
    label: 'New Chat Messages',
    description: 'When you receive new messages in match chats',
  },
];

type NotificationPreferenceState = {
  enabled: boolean;
  method: 'email' | 'sms' | 'both';
};

// Collapsible Section Component
function CollapsibleSection({
  title,
  count,
  defaultCollapsed = true,
  children,
}: {
  title: string;
  count: number;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <Card>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg font-semibold text-gray-900">{title}</span>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {count}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!isCollapsed && <div className="p-4 pt-0">{children}</div>}
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useRequireAuth();
  const [preferences, setPreferences] = useState<Record<NotificationType, NotificationPreferenceState>>({
    match_created: { enabled: false, method: 'email' },
    match_accepted: { enabled: false, method: 'email' }, // Default OFF - users can enable if they want
    match_applicant: { enabled: false, method: 'email' }, // Default OFF - users can enable if they want
    match_confirmed: { enabled: true, method: 'email' }, // Default ON - critical notification
    court_changes: { enabled: false, method: 'email' },
    score_reminder: { enabled: false, method: 'email' },
    new_chat: { enabled: false, method: 'email' },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    loadPreferences();
  }, [user, router]);

  // Convert backend format to frontend format
  const convertBackendToFrontend = (emailEnabled: boolean, smsEnabled: boolean): NotificationPreferenceState => {
    const enabled = emailEnabled || smsEnabled;
    let method: 'email' | 'sms' | 'both' = 'email';
    
    if (emailEnabled && smsEnabled) {
      method = 'both';
    } else if (smsEnabled) {
      method = 'sms';
    } else if (emailEnabled) {
      method = 'email';
    }

    return { enabled, method };
  };

  // Convert frontend format to backend format
  const convertFrontendToBackend = (pref: NotificationPreferenceState): { emailEnabled: boolean; smsEnabled: boolean } => {
    return {
      emailEnabled: pref.enabled && (pref.method === 'email' || pref.method === 'both'),
      smsEnabled: pref.enabled && (pref.method === 'sms' || pref.method === 'both'),
    };
  };

  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const prefs = await notificationsApi.getPreferences();
      
      // Initialize preferences object with defaults
      const prefsMap: Record<NotificationType, NotificationPreferenceState> = {
        match_created: { enabled: false, method: 'email' },
        match_accepted: { enabled: false, method: 'email' },
        match_applicant: { enabled: false, method: 'email' },
        match_confirmed: { enabled: false, method: 'email' },
        court_changes: { enabled: false, method: 'email' },
        score_reminder: { enabled: false, method: 'email' },
        new_chat: { enabled: false, method: 'email' },
      };

      // Map loaded preferences and convert format
      prefs.forEach((pref) => {
        if (pref.notificationType in prefsMap) {
          prefsMap[pref.notificationType as NotificationType] = convertBackendToFrontend(
            pref.emailEnabled,
            pref.smsEnabled
          );
        }
      });

      setPreferences(prefsMap);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const updatePreference = async (type: NotificationType, updates: Partial<NotificationPreferenceState>) => {
    const currentPref = preferences[type];
    const newPref: NotificationPreferenceState = {
      ...currentPref,
      ...updates,
    };

    // Optimistically update UI
    setPreferences({
      ...preferences,
      [type]: newPref,
    });

    try {
      setIsSaving(true);
      setSaveMessage(null);
      
      const backendFormat = convertFrontendToBackend(newPref);
      
      await notificationsApi.updatePreference({
        notificationType: type,
        emailEnabled: backendFormat.emailEnabled,
        smsEnabled: backendFormat.smsEnabled,
      });

      setSaveMessage({ type: 'success', text: 'Preferences saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to update preference:', error);
      // Revert on error
      setPreferences({
        ...preferences,
        [type]: currentPref,
      });
      setSaveMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save preferences' });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
        </div>

        {saveMessage && (
          <div
            className={`rounded-md p-4 ${
              saveMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        {/* Notification Preferences */}
        <CollapsibleSection title="Notification Preferences" count={NOTIFICATION_TYPES.length} defaultCollapsed={true}>
          <p className="text-sm text-gray-600 mb-6">
            Choose how you want to be notified about different events. You can enable notifications via email, SMS, or both.
          </p>

          <div className="space-y-6">
            {NOTIFICATION_TYPES.map((notificationType) => {
              const pref = preferences[notificationType.type];
              return (
                <div key={notificationType.type} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{notificationType.label}</h3>
                        <p className="text-sm text-gray-600 mt-1">{notificationType.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.enabled}
                          onChange={(e) => {
                            const newEnabled = e.target.checked;
                            updatePreference(notificationType.type, {
                              enabled: newEnabled,
                              method: newEnabled ? pref.method : 'email',
                            });
                          }}
                          disabled={isSaving}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  {pref.enabled && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notification Method
                      </label>
                      <select
                        value={pref.method}
                        onChange={(e) => {
                          const newMethod = e.target.value as 'email' | 'sms' | 'both';
                          // If SMS is selected but user has no phone, default to email
                          if ((newMethod === 'sms' || newMethod === 'both') && !user.phone) {
                            updatePreference(notificationType.type, { method: 'email' });
                          } else {
                            updatePreference(notificationType.type, { method: newMethod });
                          }
                        }}
                        disabled={isSaving}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="email">Email</option>
                        {user.phone && <option value="sms">SMS</option>}
                        {user.phone && <option value="both">Both (Email & SMS)</option>}
                      </select>
                      {!user.phone && (pref.method === 'sms' || pref.method === 'both') && (
                        <p className="text-xs text-gray-500 mt-1">
                          Add phone number in Profile to enable SMS notifications
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Account Settings */}
        <CollapsibleSection title="Account Settings" count={3} defaultCollapsed={true}>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">Email Address</p>
                <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/profile')}>
                Change
              </Button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">Phone Number</p>
                <p className="text-sm text-gray-500 mt-1">{user.phone || 'Not set'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/profile')}>
                {user.phone ? 'Change' : 'Add'}
              </Button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Password</p>
                <p className="text-sm text-gray-500 mt-1">Last changed: Never</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/profile')}>
                Change
              </Button>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </Layout>
  );
}
