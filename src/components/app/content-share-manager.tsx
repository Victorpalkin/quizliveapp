'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Share2, Trash2, Loader2, UserPlus } from 'lucide-react';
import { useFirestore, useUser, trackEvent } from '@/firebase';
import { collection, deleteDoc, doc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore';
import type { ContentType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Common share data structure
interface ShareData {
  id: string;
  sharedWith: string;
  sharedBy: string;
  sharedByEmail: string;
  createdAt: Date;
}

interface ContentShareManagerProps {
  contentId: string;
  contentTitle: string;
  contentType: Exclude<ContentType, 'quiz'>; // Quiz uses existing QuizShareManager
}

// Collection and field names based on content type
const contentConfig = {
  poll: {
    collection: 'activities',
    idField: 'pollId',
    titleField: 'pollTitle',
    label: 'Poll',
    eventName: 'poll_shared',
  },
  presentation: {
    collection: 'presentations',
    idField: 'presentationId',
    titleField: 'presentationTitle',
    label: 'Presentation',
    eventName: 'presentation_shared',
  },
} as const;

export function ContentShareManager({ contentId, contentTitle, contentType }: ContentShareManagerProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shares, setShares] = useState<ShareData[]>([]);
  const [loading, setLoading] = useState(true);

  const config = contentConfig[contentType];

  // Subscribe to shares collection
  useEffect(() => {
    if (!firestore || !contentId) return;

    const sharesRef = collection(firestore, config.collection, contentId, 'shares');
    const unsubscribe = onSnapshot(sharesRef, (snapshot) => {
      const sharesList: ShareData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sharesList.push({
          id: doc.id,
          sharedWith: data.sharedWith,
          sharedBy: data.sharedBy,
          sharedByEmail: data.sharedByEmail,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setShares(sharesList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, contentId, config.collection]);

  const handleShare = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast({ variant: 'destructive', title: 'Email is required' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast({ variant: 'destructive', title: 'Invalid email address' });
      return;
    }

    // Can't share with yourself
    if (trimmedEmail === user?.email?.toLowerCase()) {
      toast({ variant: 'destructive', title: "You can't share with yourself" });
      return;
    }

    // Check if already shared
    if (shares?.some(s => s.sharedWith.toLowerCase() === trimmedEmail)) {
      toast({ variant: 'destructive', title: 'Already shared with this user' });
      return;
    }

    setSharing(true);
    try {
      // Use email as document ID for efficient exists() checks in security rules
      const shareDocRef = doc(firestore, config.collection, contentId, 'shares', trimmedEmail);

      const shareData = {
        [config.idField]: contentId,
        [config.titleField]: contentTitle,
        sharedWith: trimmedEmail,
        sharedBy: user?.uid,
        sharedByEmail: user?.email,
        createdAt: serverTimestamp(),
      };

      await setDoc(shareDocRef, shareData);

      // Track share event
      trackEvent(config.eventName);

      toast({
        title: `${config.label} shared successfully`,
        description: `Shared with ${trimmedEmail}`,
      });
      setEmail('');
    } catch (error) {
      console.error(`Error sharing ${contentType}:`, error);
      toast({
        variant: 'destructive',
        title: `Failed to share ${contentType}`,
        description: 'Please try again.',
      });
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string, sharedWith: string) => {
    try {
      await deleteDoc(doc(firestore, config.collection, contentId, 'shares', shareId));
      toast({
        title: 'Share removed',
        description: `Removed share with ${sharedWith}`,
      });
    } catch (error) {
      console.error('Error removing share:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to remove share',
        description: 'Please try again.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <CardTitle>Share {config.label}</CardTitle>
        </div>
        <CardDescription>
          Share this {contentType} with other hosts by entering their email address
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleShare(e as unknown as React.MouseEvent);
              }
            }}
            disabled={sharing}
            className="flex-1"
          />
          <Button type="button" onClick={handleShare} disabled={sharing}>
            {sharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Share
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Shared with ({shares?.length || 0})</h4>
          {loading ? (
            <div className="space-y-2">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          ) : shares && shares.length > 0 ? (
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="text-sm">{share.sharedWith}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove share?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {share.sharedWith} will no longer be able to access this {contentType}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveShare(share.id, share.sharedWith)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              Not shared with anyone yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
