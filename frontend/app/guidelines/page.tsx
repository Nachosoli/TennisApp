'use client';

import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';

export default function GuidelinesPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Code of Conduct & Guidelines</h1>

        <Card>
          <div className="p-6 space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to CourtMate</h2>
              <p className="text-gray-600">
                CourtMate is a community platform designed to help tennis players find matches and connect 
                with fellow players. To ensure a positive experience for everyone, we ask that all members 
                follow these guidelines.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Expected Behavior</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong className="text-gray-900">Be Respectful:</strong> Treat all players with kindness, respect, and sportsmanship both on and off the court.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong className="text-gray-900">Be Honest:</strong> Accurately represent your skill level, availability, and match preferences.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong className="text-gray-900">Be Reliable:</strong> Show up on time for matches and communicate promptly if plans change.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong className="text-gray-900">Be Safe:</strong> Prioritize your safety and the safety of others. Meet in public places and trust your instincts.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong className="text-gray-900">Be Communicative:</strong> Respond to messages and match requests in a timely manner.</span>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">What to Expect</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong className="text-gray-900">Match Quality:</strong> Players are matched based on skill level, location, and preferences to ensure competitive and enjoyable matches.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong className="text-gray-900">Flexible Scheduling:</strong> Create matches with multiple time slots to accommodate different schedules.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong className="text-gray-900">Transparent Profiles:</strong> View player ratings, ELO scores, and win rates to make informed decisions.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong className="text-gray-900">Court Information:</strong> Access detailed information about courts including location, surface type, and amenities.</span>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">How to Behave</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Before the Match</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                    <li>Confirm match details (date, time, location) at least 24 hours in advance</li>
                    <li>Communicate any changes or cancellations as soon as possible</li>
                    <li>Arrive on time and prepared with appropriate equipment</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">During the Match</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                    <li>Follow standard tennis etiquette and rules</li>
                    <li>Be a good sport, win or lose</li>
                    <li>Report accurate scores after the match</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">After the Match</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                    <li>Submit match results promptly and accurately</li>
                    <li>Provide constructive feedback when appropriate</li>
                    <li>Respect your opponent's privacy and boundaries</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Prohibited Behavior</h2>
              <p className="text-gray-600 mb-3">
                The following behaviors are not tolerated and may result in account suspension or termination:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">✗</span>
                  <span>Harassment, discrimination, or abusive language</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">✗</span>
                  <span>No-shows or repeated cancellations without notice</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">✗</span>
                  <span>Misrepresenting skill level or match results</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">✗</span>
                  <span>Spam, solicitation, or inappropriate content</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">✗</span>
                  <span>Any illegal activities or violations of local laws</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Need Help?</h3>
              <p className="text-blue-800">
                If you encounter any issues or witness behavior that violates these guidelines, 
                please <a href="/contact" className="underline font-medium">contact us</a> immediately. 
                We take all reports seriously and will investigate promptly.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

