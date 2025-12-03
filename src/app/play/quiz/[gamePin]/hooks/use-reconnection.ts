import { useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, collection, query, where, getDocs, setDoc, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Player, Game } from '@/lib/types';
import type { PlayerState } from './use-player-state-machine';

interface UseReconnectionParams {
  state: PlayerState;
  setState: (state: PlayerState) => void;
  game: Game | null;
  gameLoading: boolean;
  gameDocId: string | null;
  playerId: string;
  nickname: string;
  setPlayer: (player: Player | null) => void;
  sessionManager: {
    clearSession: () => void;
  };
}

/**
 * Handles player reconnection when returning to a game with a valid session.
 *
 * Reconnection flow:
 * 1. Verify game still exists and is not ended
 * 2. Check if player document exists
 * 3. Restore player data or recreate player document
 * 4. Transition to appropriate state based on host game state
 */
export function useReconnection({
  state,
  setState,
  game,
  gameLoading,
  gameDocId,
  playerId,
  nickname,
  setPlayer,
  sessionManager,
}: UseReconnectionParams) {
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (state !== 'reconnecting') return;

    const attemptReconnect = async () => {
      try {
        // No game document ID means invalid session
        if (!gameDocId) {
          console.log('[Reconnect] No game reference, clearing session');
          sessionManager.clearSession();
          setState('session-invalid');
          return;
        }

        // Wait for game data to load
        if (gameLoading) return;

        // Game doesn't exist anymore
        if (!game) {
          console.log('[Reconnect] Game not found, clearing session');
          sessionManager.clearSession();
          setState('session-invalid');
          toast({
            variant: 'destructive',
            title: 'Session Expired',
            description: 'The game has ended or was cancelled.'
          });
          return;
        }

        // Game has ended
        if (game.state === 'ended') {
          console.log('[Reconnect] Game has ended');
          sessionManager.clearSession();
          setState('ended');
          return;
        }

        // Verify player document exists
        const playerRef = doc(firestore, 'games', gameDocId, 'players', playerId) as DocumentReference<Player>;
        const playerQuery = query(
          collection(firestore, 'games', gameDocId, 'players'),
          where('__name__', '==', playerId)
        );
        const playerDoc = await getDocs(playerQuery);

        if (playerDoc.empty) {
          // Recreate player document if missing
          console.log('[Reconnect] Player document missing, attempting to recreate');
          const newPlayer: Player = {
            id: playerId,
            name: nickname,
            score: 0,
            answers: [],
            currentStreak: 0
          };
          await setDoc(playerRef, newPlayer);
          setPlayer(newPlayer);
          toast({
            title: 'Reconnected!',
            description: 'Successfully rejoined the game.'
          });
        } else {
          // Restore existing player data
          const playerData = playerDoc.docs[0].data() as Player;
          setPlayer(playerData);
          toast({
            title: 'Reconnected!',
            description: 'Successfully resumed your session.'
          });
        }

        // Transition to appropriate state based on host game state
        switch (game.state) {
          case 'lobby':
            setState('lobby');
            break;
          case 'preparing':
            setState('preparing');
            break;
          case 'question':
            setState('question');
            break;
          case 'leaderboard':
            setState('result');
            break;
        }
      } catch (error) {
        console.error('[Reconnect] Error during reconnection:', error);
        sessionManager.clearSession();
        setState('session-invalid');
        toast({
          variant: 'destructive',
          title: 'Reconnection Failed',
          description: 'Could not restore your session. Please rejoin the game.'
        });
      }
    };

    attemptReconnect();
  }, [state, game, gameLoading, gameDocId, playerId, nickname, firestore, sessionManager, toast, setState, setPlayer]);
}
