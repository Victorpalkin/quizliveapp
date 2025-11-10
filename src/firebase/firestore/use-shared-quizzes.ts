import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { QuizShare, Quiz } from '@/lib/types';

export function useSharedQuizzes() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [shares, setShares] = useState<(QuizShare & { quiz?: Quiz })[]>([]);
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

        // Query all shares subcollections where sharedWith matches user email
        const sharesRef = collectionGroup(firestore, 'shares');
        const q = query(sharesRef, where('sharedWith', '==', user.email.toLowerCase()));
        const querySnapshot = await getDocs(q);

        const fetchedShares: (QuizShare & { quiz?: Quiz })[] = [];

        for (const shareDoc of querySnapshot.docs) {
          const shareData = shareDoc.data();

          // Fetch the associated quiz
          try {
            const quizDoc = await getDoc(doc(firestore, 'quizzes', shareData.quizId));
            if (quizDoc.exists()) {
              fetchedShares.push({
                id: shareDoc.id,
                quizId: shareData.quizId,
                quizTitle: shareData.quizTitle,
                sharedWith: shareData.sharedWith,
                sharedBy: shareData.sharedBy,
                sharedByEmail: shareData.sharedByEmail,
                createdAt: shareData.createdAt?.toDate() || new Date(),
                quiz: { id: quizDoc.id, ...quizDoc.data() } as Quiz,
              });
            }
          } catch (error) {
            console.error('Error fetching quiz for share:', error);
          }
        }

        setShares(fetchedShares);
      } catch (error) {
        console.error('Error fetching shared quizzes:', error);
        setShares([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShares();
  }, [firestore, user?.email]);

  return { shares, loading };
}
