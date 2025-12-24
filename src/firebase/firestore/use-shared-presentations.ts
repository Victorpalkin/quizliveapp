import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { PresentationShare, Presentation } from '@/lib/types';

export function useSharedPresentations() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [shares, setShares] = useState<(PresentationShare & { presentation?: Presentation })[]>([]);
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

        // Query all shares subcollections in presentations where sharedWith matches user email
        const sharesRef = collectionGroup(firestore, 'shares');
        const q = query(
          sharesRef,
          where('sharedWith', '==', user.email!.toLowerCase()),
          where('presentationId', '!=', null)
        );
        const querySnapshot = await getDocs(q);

        const fetchedShares: (PresentationShare & { presentation?: Presentation })[] = [];

        for (const shareDoc of querySnapshot.docs) {
          const shareData = shareDoc.data();

          // Fetch the associated presentation
          try {
            const presDoc = await getDoc(doc(firestore, 'presentations', shareData.presentationId));
            if (presDoc.exists()) {
              const presData = presDoc.data();
              fetchedShares.push({
                id: shareDoc.id,
                presentationId: shareData.presentationId,
                presentationTitle: shareData.presentationTitle,
                sharedWith: shareData.sharedWith,
                sharedBy: shareData.sharedBy,
                sharedByEmail: shareData.sharedByEmail,
                createdAt: shareData.createdAt?.toDate() || new Date(),
                presentation: {
                  id: presDoc.id,
                  ...presData,
                  createdAt: presData.createdAt?.toDate() || new Date(),
                  updatedAt: presData.updatedAt?.toDate() || new Date(),
                } as Presentation,
              });
            }
          } catch (error) {
            console.error('Error fetching presentation for share:', error);
          }
        }

        setShares(fetchedShares);
      } catch (error) {
        console.error('Error fetching shared presentations:', error);
        setShares([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShares();
  }, [firestore, user?.email]);

  return { shares, loading };
}
