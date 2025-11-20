'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/errors';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number must be 10 digits').regex(/^\d{10}$/, 'Phone must be a valid US phone number (10 digits)'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

function RegisterPageContent() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    // @ts-expect-error - zodResolver type compatibility issue with react-hook-form
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  // Auto-format phone number
  const phoneRegister = register('phone');
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Limit to 10 digits
    if (digits.length <= 10) {
      // Update the event's target value to the formatted digits
      e.target.value = digits;
      // Update form state
      setValue('phone', digits, { shouldValidate: true, shouldDirty: true });
    }
    // Call the original onChange from register with the updated event
    phoneRegister.onChange(e);
  };

  const formatPhoneForSubmit = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // If it's 10 digits, prepend +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    // If it's 11 digits and starts with 1, prepend +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    // Return as is (backend will handle validation)
    return phone;
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      setSuccess(false);
      console.log('Form submitted with data:', data);
      // Format phone number before submitting
      const formattedData = {
        ...data,
        phone: formatPhoneForSubmit(data.phone),
      };
      console.log('Formatted data:', formattedData);
      await registerUser(formattedData);
      setSuccess(true);
      // Redirect to profile after a brief delay to show success message
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
          <p className="mt-2 text-sm text-gray-700">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p className="font-medium">Account created successfully!</p>
              <p className="text-sm mt-1">A verification email has been sent to your email address. Redirecting to profile...</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              {...register('firstName')}
              error={errors.firstName?.message}
              placeholder="John"
            />
            <Input
              label="Last Name"
              {...register('lastName')}
              error={errors.lastName?.message}
              placeholder="Doe"
            />
          </div>

          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="Enter your password"
            showPasswordToggle={true}
          />

          <Input
            label="Phone *"
            type="tel"
            {...phoneRegister}
            onChange={handlePhoneChange}
            error={errors.phone?.message}
            placeholder="1234567890"
          />
          <p className="text-xs text-gray-500 -mt-2">Enter your 10-digit US phone number</p>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Create account
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <ErrorBoundary>
      <RegisterPageContent />
    </ErrorBoundary>
  );
}

