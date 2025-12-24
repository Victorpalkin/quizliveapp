import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { PollShare, PollActivity } from '@/lib/types';

export function useSharedPolls() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [shares, setShares] = useState<(PollShare & { poll?: PollActivity })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      setShares([]);
      return;
    }

    const fetchShares = async () => {
      try {
        setLoading(true);

        // Query all shares subcollections in activities where sharedWith matches user email
        // and the document has pollId (indicating it's a poll share)
        const sharesRef = collectionGroup(firestore, 'shares');
        const q = query(
          sharesRef,
          where('sharedWith', '==', user.email!.toLowerCase()),
          where('pollId', '!=', null)
        );
        const querySnapshot = await getDocs(q);

        const fetchedShares: (PollShare & { poll?: PollActivity })[] = [];

        for (const shareDoc of querySnapshot.docs) {
          const shareData = shareDoc.data();

          // Fetch the associated poll activity
          try {
            const pollDoc = await getDoc(doc(firestore, 'activities', shareData.pollId));
            if (pollDoc.exists()) {
              const pollData = pollDoc.data();
              // Only include if it's a poll type
              if (pollData.type === 'poll') {
                fetchedShares.push({
                  id: shareDoc.id,
                  pollId: shareData.pollId,
                  pollTitle: shareData.pollTitle,
                  sharedWith: shareData.sharedWith,
                  sharedBy: shareData.sharedBy,
                  sharedByEmail: shareData.sharedByEmail,
                  createdAt: shareData.createdAt?.toDate() || new Date(),
                  poll: { id: pollDoc.id, ...pollData } as PollActivity,
                });
              }
            }
          } catch (error) {
            console.error('Error fetching poll for share:', error);
          }
        }

        setShares(fetchedShares);
      } catch (error) {
        console.error('Error fetching shared polls:', error);
        setShares([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShares();
  }, [firestore, user?.email]);

  return { shares, loading };
}
