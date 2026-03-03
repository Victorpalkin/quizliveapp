'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlayerHeader } from './PlayerHeader';
import { ReactionBar } from './ReactionBar';
import { IdleView } from './IdleView';
import { PlayerQuiz } from './elements/PlayerQuiz';
import { PlayerPoll } from './elements/PlayerPoll';
import { PlayerThoughts } from './elements/PlayerThoughts';
import { PlayerRating } from './elements/PlayerRating';
import type { PresentationGame, PresentationSlide, SlideElement } from '@/lib/types';

interface PlayerSession {
  playerId: string;
  playerName: string;
  gameId: string;
}

interface PresentationPlayerProps {
  state: 'joining' | 'lobby' | 'active' | 'ended';
  game: PresentationGame | null;
  session: PlayerSession | null;
  currentSlide: PresentationSlide | null;
  interactiveElement: SlideElement | null;
  slides: PresentationSlide[];
  playerScore: number;
  playerStreak: number;
  joinGame: (name: string) => Promise<void>;
  markResponded: (elementId: string) => void;
  hasResponded: (elementId: string) => boolean;
}

export function PresentationPlayer({
  state,
  game,
  session,
  currentSlide,
  interactiveElement,
  playerScore,
  playerStreak,
  joinGame,
  markResponded,
  hasResponded,
}: PresentationPlayerProps) {
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!name.trim()) return;
    setJoining(true);
    try {
      await joinGame(name.trim());
    } finally {
      setJoining(false);
    }
  };

  // Joining screen
  if (state === 'joining') {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center">Join Game</h1>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <Button
            onClick={handleJoin}
            disabled={!name.trim() || joining}
            className="w-full"
            variant="gradient"
          >
            {joining ? 'Joining...' : 'Join'}
          </Button>
        </div>
      </div>
    );
  }

  // Lobby screen
  if (state === 'lobby') {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-2xl">🎯</span>
          </div>
          <h1 className="text-2xl font-bold">You&apos;re in!</h1>
          <p className="text-lg text-muted-foreground">{session?.playerName}</p>
          <p className="text-sm text-muted-foreground">Waiting for the host to start...</p>
        </div>
      </div>
    );
  }

  // Ended screen
  if (state === 'ended') {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Game Over!</h1>
          <div className="text-4xl font-bold text-primary">{playerScore.toLocaleString()}</div>
          <p className="text-muted-foreground">points</p>
          {playerStreak > 0 && (
            <p className="text-sm text-muted-foreground">Best streak: {playerStreak}</p>
          )}
        </div>
      </div>
    );
  }

  // Active state
  const responded = interactiveElement ? hasResponded(interactiveElement.id) : false;

  return (
    <div className="flex flex-col h-screen">
      <PlayerHeader
        playerName={session?.playerName || ''}
        score={playerScore}
        streak={playerStreak}
      />

      <div className="flex-1 overflow-y-auto">
        {interactiveElement && !responded ? (
          // Show interactive element UI
          <div className="p-4">
            {interactiveElement.type === 'quiz' && game && session && (
              <PlayerQuiz
                element={interactiveElement}
                gameId={game.id}
                playerId={session.playerId}
                playerName={session.playerName}
                onSubmitted={() => markResponded(interactiveElement.id)}
              />
            )}
            {interactiveElement.type === 'poll' && game && session && (
              <PlayerPoll
                element={interactiveElement}
                gameId={game.id}
                playerId={session.playerId}
                playerName={session.playerName}
                onSubmitted={() => markResponded(interactiveElement.id)}
              />
            )}
            {interactiveElement.type === 'thoughts' && game && session && (
              <PlayerThoughts
                element={interactiveElement}
                gameId={game.id}
                playerId={session.playerId}
                playerName={session.playerName}
                onSubmitted={() => markResponded(interactiveElement.id)}
              />
            )}
            {interactiveElement.type === 'rating' && game && session && (
              <PlayerRating
                element={interactiveElement}
                gameId={game.id}
                playerId={session.playerId}
                playerName={session.playerName}
                onSubmitted={() => markResponded(interactiveElement.id)}
              />
            )}
          </div>
        ) : (
          <IdleView
            currentSlide={currentSlide}
            responded={responded}
          />
        )}
      </div>

      {/* Reaction bar always visible during active state */}
      {game?.settings.enableReactions && game && (
        <ReactionBar gameId={game.id} playerId={session?.playerId || ''} />
      )}
    </div>
  );
}
