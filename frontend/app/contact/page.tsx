'use client';

import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';

export default function ContactPage() {
  const { isLoading: authLoading, user } = useRequireAuth();

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h1>

        <Card>
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
              <p className="text-gray-600 mb-4">
                We'd love to hear from you! Whether you have a question, feedback, or need support, 
                we're here to help.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Email Support</h3>
                <p className="text-gray-600">
                  For general inquiries, support, or feedback, please email us at:
                </p>
                <a
                  href="mailto:support@courtmate.com"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  support@courtmate.com
                </a>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Report an Issue</h3>
                <p className="text-gray-600 mb-2">
                  If you encounter any technical issues or have concerns about user behavior, 
                  please contact us immediately.
                </p>
                <a
                  href="mailto:report@courtmate.com"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  report@courtmate.com
                </a>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Response Time</h3>
                <p className="text-gray-600">
                  We typically respond to all inquiries within 24-48 hours during business days.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Before Contacting Us</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Check our <a href="/guidelines" className="text-blue-600 hover:text-blue-800 underline">Guidelines</a> page for common questions</li>
                <li>Review your profile settings if you're experiencing account issues</li>
                <li>Include relevant details (match ID, screenshots, etc.) when reporting issues</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

