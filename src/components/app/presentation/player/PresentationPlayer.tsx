'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlayerHeader } from './PlayerHeader';
import { ReactionBar } from './ReactionBar';
import { IdleView } from './IdleView';
import { PlayerQuiz } from './elements/PlayerQuiz';
import { PlayerPoll } from './elements/PlayerPoll';
import { PlayerThoughts } from './elements/PlayerThoughts';
import { PlayerRating } from './elements/PlayerRating';
import { PlayerEvaluation } from './elements/PlayerEvaluation';
import { PlayerAgenticDesigner } from './elements/PlayerAgenticDesigner';
import { PlayerAIStep } from './elements/PlayerAIStep';
import { PlayerQuizResult } from './elements/PlayerQuizResult';
import { PlayerLeaderboardView } from './elements/PlayerLeaderboardView';
import { PlayerQA } from './elements/PlayerQA';
import type { PresentationGame, PresentationSlide, SlideElement } from '@/lib/types';
import type { QuizResult } from '@/app/play/presentation/[gamePin]/hooks/use-player-state-machine';

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
  resultsElement: SlideElement | null;
  leaderboardElement: SlideElement | null;
  qaElement: SlideElement | null;
  slides: PresentationSlide[];
  playerScore: number;
  playerStreak: number;
  joinGame: (name: string) => Promise<void>;
  markResponded: (elementId: string) => void;
  hasResponded: (elementId: string) => boolean;
  storeQuizResult: (elementId: string, result: QuizResult) => void;
  handleTimeout: (elementId: string) => void;
  getQuizResult: (elementId: string) => QuizResult | null;
}

function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

export function PresentationPlayer({
  state,
  game,
  session,
  currentSlide,
  interactiveElement,
  resultsElement,
  leaderboardElement,
  qaElement,
  playerScore,
  playerStreak,
  joinGame,
  markResponded,
  hasResponded,
  storeQuizResult,
  handleTimeout,
  getQuizResult,
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

  return (
    <AnimatePresence mode="wait">
      {/* Joining screen */}
      {state === 'joining' && (
        <motion.div
          key="joining"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center h-screen p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="w-full max-w-sm space-y-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
                <span className="text-2xl text-white font-bold">Z</span>
              </div>
              <h1 className="text-2xl font-bold">Join Game</h1>
            </motion.div>
            <div className="glass rounded-2xl p-6 space-y-4 shadow-xl">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={20}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                autoFocus
                className="h-12 text-base bg-background/50"
              />
              <Button
                onClick={handleJoin}
                disabled={!name.trim() || joining}
                className="w-full h-12 text-base"
                variant="gradient"
              >
                {joining ? 'Joining...' : 'Join'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Lobby screen */}
      {state === 'lobby' && (
        <motion.div
          key="lobby"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center h-screen p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5"
        >
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="relative w-20 h-20 mx-auto"
            >
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-ring [animation-delay:0.5s]" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                <span className="text-3xl">🎯</span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-2xl font-bold">You&apos;re in!</h1>
              <div className="mt-2 inline-block glass rounded-full px-4 py-1.5">
                <p className="text-lg font-medium">{session?.playerName}</p>
              </div>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-muted-foreground animate-glow-pulse"
            >
              Waiting for the host to start...
            </motion.p>
          </div>
        </motion.div>
      )}

      {/* Ended screen */}
      {state === 'ended' && (
        <motion.div
          key="ended"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center h-screen p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5"
        >
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="text-6xl"
            >
              🏆
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold"
            >
              Game Over!
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className="glass rounded-2xl p-6 inline-block"
            >
              <div className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                <AnimatedScore value={playerScore} />
              </div>
              <p className="text-muted-foreground mt-1">points</p>
            </motion.div>
            {playerStreak > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sm text-muted-foreground"
              >
                Best streak: {playerStreak} 🔥
              </motion.p>
            )}
          </div>
        </motion.div>
      )}

      {/* Active state */}
      {state === 'active' && (
        <motion.div
          key="active"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col h-screen"
        >
          <PlayerHeader
            playerName={session?.playerName || ''}
            score={playerScore}
            streak={playerStreak}
          />

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {interactiveElement && !hasResponded(interactiveElement.id) ? (
                <motion.div
                  key={`element-${interactiveElement.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="p-4"
                >
                  {interactiveElement.type === 'quiz' && game && session && (
                    <PlayerQuiz
                      element={interactiveElement}
                      gameId={game.id}
                      playerId={session.playerId}
                      playerName={session.playerName}
                      timerStartedAt={game.timerStartedAt ?? null}
                      onSubmitted={() => markResponded(interactiveElement.id)}
                      onResult={storeQuizResult}
                      onTimeout={handleTimeout}
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
                  {interactiveElement.type === 'evaluation' && game && session && (
                    <PlayerEvaluation
                      element={interactiveElement}
                      gameId={game.id}
                      playerId={session.playerId}
                      playerName={session.playerName}
                      onSubmitted={() => markResponded(interactiveElement.id)}
                    />
                  )}
                  {interactiveElement.type === 'agentic-designer' && game && session && (
                    <PlayerAgenticDesigner
                      element={interactiveElement}
                      gameId={game.id}
                      playerId={session.playerId}
                      playerName={session.playerName}
                      onSubmitted={() => markResponded(interactiveElement.id)}
                    />
                  )}
                  {interactiveElement.type === 'ai-step' && game && session && currentSlide && (
                    <PlayerAIStep
                      element={interactiveElement}
                      gameId={game.id}
                      playerId={session.playerId}
                      playerName={session.playerName}
                      currentSlide={currentSlide}
                      onSubmitted={() => markResponded(interactiveElement.id)}
                    />
                  )}
                </motion.div>
              ) : resultsElement?.sourceElementId && game && session ? (
                <motion.div
                  key={`results-${resultsElement.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  {resultsElement.type === 'quiz-results' ? (
                    <PlayerQuizResult
                      sourceElementId={resultsElement.sourceElementId}
                      getQuizResult={getQuizResult}
                      playerScore={playerScore}
                      playerStreak={playerStreak}
                    />
                  ) : (
                    <IdleView
                      currentSlide={currentSlide}
                      responded={false}
                    />
                  )}
                </motion.div>
              ) : leaderboardElement && game && session ? (
                <motion.div
                  key={`leaderboard-${leaderboardElement.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <PlayerLeaderboardView
                    gameId={game.id}
                    playerId={session.playerId}
                    playerScore={playerScore}
                    playerStreak={playerStreak}
                  />
                </motion.div>
              ) : qaElement && game && session ? (
                <motion.div
                  key={`qa-${qaElement.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <PlayerQA
                    gameId={game.id}
                    playerId={session.playerId}
                    playerName={session.playerName}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <IdleView
                    currentSlide={currentSlide}
                    responded={interactiveElement ? hasResponded(interactiveElement.id) : false}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {game?.settings.enableReactions && game && (
            <ReactionBar gameId={game.id} playerId={session?.playerId || ''} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
