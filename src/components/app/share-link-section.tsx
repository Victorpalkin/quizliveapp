'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Link2, Copy, RefreshCw, Loader2, Check, Trash2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';
import type { ActivityType } from '@/lib/types';
import { getCollectionForType } from '@/lib/export-import';

interface ShareLinkSectionProps {
  contentId: string;
  contentTitle: string;
  contentType: ActivityType;
}

interface ShareLinkData {
  token: string;
  active: boolean;
}

export function ShareLinkSection({ contentId, contentTitle, contentType }: ShareLinkSectionProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [link, setLink] = useState<ShareLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!firestore || !user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, 'shareLinks'),
      where('contentId', '==', contentId),
      where('ownerId', '==', user.uid),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setLink(null);
      } else {
        const doc = snapshot.docs[0];
        setLink({ token: doc.id, active: doc.data().active });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, contentId, user?.uid]);

  const createLink = useCallback(async () => {
    if (!firestore || !user) return;
    setCreating(true);
    try {
      const token = nanoid(20);
      await setDoc(doc(firestore, 'shareLinks', token), {
        token,
        contentType,
        contentCollection: getCollectionForType(contentType),
        contentId,
        contentTitle,
        ownerId: user.uid,
        ownerEmail: user.email,
        createdAt: serverTimestamp(),
        active: true,
      });
      toast({ title: 'Share link created' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to create share link' });
    } finally {
      setCreating(false);
    }
  }, [firestore, user, contentType, contentId, contentTitle, toast]);

  const regenerateLink = useCallback(async () => {
    if (!firestore || !user || !link) return;
    setCreating(true);
    try {
      await deleteDoc(doc(firestore, 'shareLinks', link.token));
      const token = nanoid(20);
      await setDoc(doc(firestore, 'shareLinks', token), {
        token,
        contentType,
        contentCollection: getCollectionForType(contentType),
        contentId,
        contentTitle,
        ownerId: user.uid,
        ownerEmail: user.email,
        createdAt: serverTimestamp(),
        active: true,
      });
      toast({ title: 'Share link regenerated', description: 'Previous link no longer works' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to regenerate link' });
    } finally {
      setCreating(false);
    }
  }, [firestore, user, link, contentType, contentId, contentTitle, toast]);

  const removeLink = useCallback(async () => {
    if (!firestore || !link) return;
    try {
      await deleteDoc(doc(firestore, 'shareLinks', link.token));
      toast({ title: 'Share link removed' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to remove link' });
    }
  }, [firestore, link, toast]);

  const copyLink = useCallback(() => {
    if (!link) return;
    const url = `${window.location.origin}/share/${link.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copied to clipboard' });
  }, [link, toast]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading share link...</span>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Share via link</h4>
        <Button
          variant="outline"
          className="w-full"
          onClick={createLink}
          disabled={creating}
        >
          {creating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 h-4 w-4" />
          )}
          Create share link
        </Button>
        <p className="text-xs text-muted-foreground">
          Anyone with a Zivo account and the link can access this content
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Share via link</h4>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center px-3 py-2 bg-muted rounded-lg text-sm font-mono text-muted-foreground truncate">
          {`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${link.token}`}
        </div>
        <Button size="icon" variant="outline" onClick={copyLink} title="Copy link">
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={regenerateLink}
          disabled={creating}
          className="text-muted-foreground"
        >
          {creating ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3 w-3" />
          )}
          Regenerate
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={removeLink}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Remove link
        </Button>
      </div>
    </div>
  );
}
