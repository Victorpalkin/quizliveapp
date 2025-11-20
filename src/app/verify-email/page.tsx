'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Header } from '@/components/app/header';
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { useEmailVerification } from '@/firebase/auth/use-email-verification';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const { sendVerification, checkVerification, isSending, isChecking } = useEmailVerification();

  const [isVerified, setIsVerified] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  // Check if user is already verified on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!user || userLoading) return;

      // If user is already verified, redirect to host page
      if (user.emailVerified) {
        setIsVerified(true);
        toast({
          title: 'Email Verified',
          description: 'Your email has been verified successfully!',
        });
        setTimeout(() => {
          router.push('/host');
        }, 1500);
      }
    };

    checkStatus();
  }, [user, userLoading, router, toast]);

  // If no user is signed in, redirect to login
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const handleResendVerification = async () => {
    const result = await sendVerification();

    if (result.success) {
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox for the verification link.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Email',
        description: result.error || 'Please try again later.',
      });
    }
  };

  const handleCheckVerification = async () => {
    // Prevent checking too frequently (rate limiting)
    const now = Date.now();
    if (now - lastCheckTime < 3000) {
      toast({
        variant: 'destructive',
        title: 'Please Wait',
        description: 'Please wait a few seconds before checking again.',
      });
      return;
    }

    setLastCheckTime(now);

    const result = await checkVerification();

    if (result.verified) {
      setIsVerified(true);
      toast({
        title: 'Email Verified',
        description: 'Your email has been verified successfully!',
      });
      setTimeout(() => {
        router.push('/host');
      }, 1500);
    } else if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Check Failed',
        description: result.error,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Not Verified Yet',
        description: 'Please click the verification link in your email first.',
      });
    }
  };

  if (userLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-grid-small">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (isVerified) {
    return (
      <div className="flex min-h-screen flex-col bg-grid-small">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl">Email Verified!</CardTitle>
              <CardDescription>Redirecting to dashboard...</CardDescription>
            </CardHeader>
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
              <Mail className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl">Verify Your Email</CardTitle>
            <CardDescription>
              We sent a verification link to <strong>{user.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please check your email and click the verification link to activate your account.
                Don&apos;t forget to check your spam folder!
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={handleCheckVerification}
                size="lg"
                className="w-full"
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "I've Verified My Email"
                )}
              </Button>

              <Button
                onClick={handleResendVerification}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Wrong email?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in with a different account
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
