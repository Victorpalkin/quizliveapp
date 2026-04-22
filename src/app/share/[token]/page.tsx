'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useUser, useFunctions } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Loader2, Plus, CheckCircle2, AlertCircle, Share2, LogIn } from 'lucide-react';
import { ACTIVITY_CONFIG } from '@/lib/activity-config';
import type { ActivityType } from '@/lib/types';
import Link from 'next/link';

interface ShareLinkDoc {
  contentType: ActivityType;
  contentTitle: string;
  ownerEmail: string;
  active: boolean;
}

export default function ShareClaimPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { user, loading: authLoading } = useUser();

  const [linkData, setLinkData] = useState<ShareLinkDoc | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !token) return;

    const load = async () => {
      try {
        const snap = await getDoc(doc(firestore, 'shareLinks', token));
        if (!snap.exists() || snap.data().active === false) {
          setNotFound(true);
        } else {
          setLinkData(snap.data() as ShareLinkDoc);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoadingLink(false);
      }
    };

    load();
  }, [firestore, token]);

  const handleClaim = async () => {
    if (!functions || !token) return;
    setClaiming(true);
    setError(null);

    try {
      const claimFn = httpsCallable<{ token: string }, { contentType: string }>(
        functions,
        'claimShareLink'
      );
      await claimFn({ token });
      setClaimed(true);
      setTimeout(() => router.push('/host'), 1500);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to claim share link';
      setError(message);
    } finally {
      setClaiming(false);
    }
  };

  if (authLoading || loadingLink) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const redirectPath = `/share/${token}`;
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              You need to be signed in to access shared content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="gradient">
              <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`}>
                Sign in to continue
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Link not found</CardTitle>
            <CardDescription>
              This share link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/host">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!linkData) return null;

  const activityConfig = ACTIVITY_CONFIG[linkData.contentType];
  const Icon = activityConfig.icon;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Share2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Shared Content</CardTitle>
          <CardDescription>
            Someone shared a {activityConfig.label.toLowerCase()} with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
            <div className={`p-2 rounded-lg ${activityConfig.badgeClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{linkData.contentTitle}</p>
              <p className="text-sm text-muted-foreground">
                Shared by {linkData.ownerEmail}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {claimed ? (
            <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Added to your content!</span>
            </div>
          ) : (
            <Button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full"
              variant="gradient"
            >
              {claiming ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add to My Content
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
