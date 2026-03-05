'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users } from 'lucide-react';

interface HostOverlayProps {
  gamePin: string;
  slideIndex: number;
  totalSlides: number;
  playerCount: number;
}

export function HostOverlay({ gamePin, slideIndex, totalSlides, playerCount }: HostOverlayProps) {
  const [visible, setVisible] = useState(true);

  // Show briefly when slide changes
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [slideIndex]);

  // Show when mouse enters top zone
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const handleMove = (e: MouseEvent) => {
      const inTopZone = e.clientY <= 80;
      if (inTopZone) {
        setVisible(true);
        clearTimeout(timer);
        timer = setTimeout(() => setVisible(false), 4000);
      }
    };

    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      clearTimeout(timer);
    };
  }, []);

  const progress = totalSlides > 1 ? ((slideIndex + 1) / totalSlides) * 100 : 100;

  return (
    <>
      {/* Progress bar — always visible */}
      <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-accent"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0.5 left-0 right-0 z-20 flex items-center justify-between px-5 py-2.5 backdrop-blur-xl bg-black/30 border-b border-white/10 text-white"
          >
            {/* PIN */}
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-60 uppercase tracking-wider">Pin</span>
              <span className="font-mono font-bold text-lg tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                {gamePin}
              </span>
            </div>

            {/* Slide counter */}
            <div className="text-sm font-mono opacity-70">
              {slideIndex + 1} / {totalSlides}
            </div>

            {/* Player count */}
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 opacity-60" />
              <motion.span
                key={playerCount}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="font-bold"
              >
                {playerCount}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
