import { useState, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { doc, collection, query, where, getDocs, setDoc, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { handleFirestoreError } from '@/lib/utils/error-utils';
import type { Player } from '@/lib/types';
import type { PlayerState } from './use-player-state-machine';

interface UseJoinGameParams {
  gamePin: string;
  playerId: string;
  setState: (state: PlayerState) => void;
  setGameDocId: (id: string) => void;
  setPlayer: (player: Player) => void;
  sessionManager: {
    saveSession: (playerId: string, gameDocId: string, nickname: string) => void;
  };
}

interface UseJoinGameReturn {
  nickname: string;
  setNickname: (nickname: string) => void;
  isJoining: boolean;
  handleJoinGame: (e: React.FormEvent) => Promise<void>;
}

/**
 * Handles the player join game flow.
 *
 * Join flow:
 * 1. Validate nickname (2-20 chars)
 * 2. Query for game with matching PIN in lobby state
 * 3. Create player document in game's players subcollection
 * 4. Save session to localStorage for reconnection
 * 5. Transition to lobby state
 */
export function useJoinGame({
  gamePin,
  playerId,
  setState,
  setGameDocId,
  setPlayer,
  sessionManager,
}: UseJoinGameParams): UseJoinGameReturn {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinGame = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNickname = nickname.trim();

    // Validate nickname
    if (!trimmedNickname) {
      toast({ variant: 'destructive', title: 'Nickname is required' });
      return;
    }

    if (trimmedNickname.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Nickname too short',
        description: 'Nickname must be at least 2 characters long.'
      });
      return;
    }

    if (trimmedNickname.length > 20) {
      toast({
        variant: 'destructive',
        title: 'Nickname too long',
        description: 'Nickname must be 20 characters or less.'
      });
      return;
    }

    setIsJoining(true);

    try {
      const pin = gamePin.toUpperCase();
      const gamesRef = collection(firestore, 'games');
      // Add limit(1) to stop after finding first match - faster query
      const q = query(gamesRef, where('gamePin', '==', pin), where('state', '==', 'lobby'), limit(1));

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Game not found',
          description: "Couldn't find a game with that PIN."
        });
        setIsJoining(false);
        return;
      }

      const gameDoc = querySnapshot.docs[0];
      const playerRef = doc(firestore, 'games', gameDoc.id, 'players', playerId);
      const newPlayer: Player = {
        id: playerId,
        name: trimmedNickname,
        score: 0,
        answers: [],
        currentStreak: 0
      };

      await setDoc(playerRef, newPlayer);

      // Update state after successful write
      setGameDocId(gameDoc.id);
      setPlayer(newPlayer);
      sessionManager.saveSession(playerId, gameDoc.id, trimmedNickname);
      setState('lobby');
    } catch (error) {
      console.error("Error joining game: ", error);
      handleFirestoreError(error, {
        path: `games/${gamePin}/players/${playerId}`,
        operation: 'create',
      }, "Error joining game: ");
      toast({
        variant: 'destructive',
        title: 'Error',
        description: "Could not join the game. Please try again."
      });
    } finally {
      setIsJoining(false);
    }
  }, [nickname, gamePin, playerId, firestore, toast, setState, setGameDocId, setPlayer, sessionManager]);

  return {
    nickname,
    setNickname,
    isJoining,
    handleJoinGame,
  };
}
