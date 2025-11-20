'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Header } from '@/components/app/header';
import { PasswordStrengthIndicator } from '@/components/app/password-strength-indicator';
import { BrainCircuit, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRegistration } from '@/firebase/auth/use-registration';
import { validateEmailDomain, passwordsMatch } from '@/lib/validation';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    jobRole: '',
    team: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordMatchError, setPasswordMatchError] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const { register, isLoading } = useRegistration();

  const handleEmailBlur = () => {
    const trimmedEmail = formData.email.trim();
    if (trimmedEmail && !validateEmailDomain(trimmedEmail)) {
      setEmailError('Only @google.com email addresses are allowed');
    } else {
      setEmailError(null);
    }
  };

  const handleConfirmPasswordBlur = () => {
    if (formData.confirmPassword && !passwordsMatch(formData.password, formData.confirmPassword)) {
      setPasswordMatchError('Passwords do not match');
    } else {
      setPasswordMatchError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!validateEmailDomain(formData.email.trim())) {
      setEmailError('Only @google.com email addresses are allowed');
      return;
    }

    if (!passwordsMatch(formData.password, formData.confirmPassword)) {
      setPasswordMatchError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long',
      });
      return;
    }

    // Call registration function
    const result = await register({
      email: formData.email.trim(),
      password: formData.password,
      name: formData.name.trim(),
      jobRole: formData.jobRole.trim(),
      team: formData.team.trim(),
    });

    if (result.success) {
      toast({
        title: 'Account Created',
        description: 'Please check your email to verify your account.',
      });
      // Redirect to verify-email page
      router.push('/verify-email');
    } else {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: result.error || 'An error occurred during registration. Please try again.',
      });
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

    // Clear errors when user types
    if (field === 'email') {
      setEmailError(null);
    }
    if (field === 'confirmPassword' || field === 'password') {
      setPasswordMatchError(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-grid-small">
      <Header />
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BrainCircuit className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl">Create Host Account</CardTitle>
            <CardDescription>Register to create and manage quizzes</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Security Warning */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Do not use your Google corporate password. Create a unique password for this application.
                </AlertDescription>
              </Alert>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email (@google.com)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@google.com"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  onBlur={handleEmailBlur}
                  required
                  className={emailError ? 'border-red-500' : ''}
                />
                {emailError && (
                  <p className="text-sm text-red-600">{emailError}</p>
                )}
              </div>

              {/* Job Role */}
              <div className="space-y-2">
                <Label htmlFor="jobRole">Job Role</Label>
                <Input
                  id="jobRole"
                  type="text"
                  placeholder="Software Engineer"
                  value={formData.jobRole}
                  onChange={handleInputChange('jobRole')}
                  required
                />
              </div>

              {/* Team */}
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Input
                  id="team"
                  type="text"
                  placeholder="Engineering"
                  value={formData.team}
                  onChange={handleInputChange('team')}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <PasswordStrengthIndicator password={formData.password} className="mt-2" />
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    onBlur={handleConfirmPasswordBlur}
                    required
                    className={`pr-10 ${passwordMatchError ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordMatchError && (
                  <p className="text-sm text-red-600">{passwordMatchError}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign In
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
