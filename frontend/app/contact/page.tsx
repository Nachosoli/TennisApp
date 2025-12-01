'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageLoader } from '@/components/ui/PageLoader';
import { contactApi } from '@/lib/contact';
import { getErrorMessage } from '@/lib/errors';

const contactSchema = z.object({
  subject: z.enum(['support', 'bug', 'feedback', 'feature', 'other'], {
    required_error: 'Please select a subject',
  }),
  message: z.string().min(10, 'Message must be at least 10 characters long'),
});

type ContactFormData = z.infer<typeof contactSchema>;

const subjectOptions = [
  { value: 'support', label: 'Support' },
  { value: 'bug', label: 'Report a Bug' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'feature', label: 'Request Feature' },
  { value: 'other', label: 'Other' },
];

export default function ContactPage() {
  const { isLoading: authLoading, user } = useRequireAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await contactApi.submitContactForm(data);
      setSubmitSuccess(true);
      reset();
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error: any) {
      setSubmitError(getErrorMessage(error));
      // Clear error message after 5 seconds
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setIsSubmitting(false);
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6">Contact Us</h1>

        <Card>
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
              <p className="text-gray-600 mb-4">
                We&apos;d love to hear from you! Whether you have a question, feedback, or need support, 
                we&apos;re here to help.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Subject Dropdown */}
              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Subject
                </label>
                <select
                  id="subject"
                  {...register('subject')}
                  className={`
                    w-full px-4 py-3 sm:py-2.5 border rounded-lg 
                    text-base sm:text-sm text-gray-900
                    bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${errors.subject ? 'border-red-500' : 'border-gray-300'}
                  `}
                >
                  <option value="">Select a subject...</option>
                  {subjectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.subject && (
                  <p className="mt-1.5 text-sm font-medium text-red-700">{errors.subject.message}</p>
                )}
              </div>

              {/* Message Textarea */}
              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Message
                </label>
                <textarea
                  id="message"
                  {...register('message')}
                  rows={6}
                  className={`
                    w-full px-4 py-3 sm:py-2.5 border rounded-lg 
                    text-base sm:text-sm text-gray-900 placeholder:text-gray-400
                    bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    resize-y
                    ${errors.message ? 'border-red-500' : 'border-gray-300'}
                  `}
                  placeholder="Please provide details about your inquiry..."
                />
                {errors.message && (
                  <p className="mt-1.5 text-sm font-medium text-red-700">{errors.message.message}</p>
                )}
              </div>

              {/* Success Message */}
              {submitSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  <p className="text-sm font-medium">
                    Thank you for contacting us! We&apos;ll get back to you within 24-48 hours.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  <p className="text-sm font-medium">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Send Message
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Response Time</h3>
              <p className="text-gray-600 mb-4">
                We typically respond to all inquiries within 24-48 hours during business days.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Before Contacting Us</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Check our <a href="/guidelines" className="text-blue-600 hover:text-blue-800 underline">Guidelines</a> page for common questions</li>
                <li>Review your profile settings if you&apos;re experiencing account issues</li>
                <li>Include relevant details (match ID, screenshots, etc.) when reporting issues</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

