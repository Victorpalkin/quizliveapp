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
import { KeyRound, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePasswordReset } from '@/firebase/auth/use-password-reset';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { sendPasswordReset, isSending } = usePasswordReset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await sendPasswordReset(email);

    if (result.success) {
      setEmailSent(true);
      toast({
        title: 'Email Sent',
        description: 'If an account exists with this email, a password reset link has been sent.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Email',
        description: result.error || 'Please try again later.',
      });
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen flex-col bg-grid-small">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl">Check Your Email</CardTitle>
              <CardDescription>
                We&apos;ve sent a password reset link to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                  Don&apos;t forget to check your spam folder!
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Resend Email
                </Button>

                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="w-full"
                >
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-grid-small">
      <Header />
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@google.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign In
                </Link>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Create Account
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
