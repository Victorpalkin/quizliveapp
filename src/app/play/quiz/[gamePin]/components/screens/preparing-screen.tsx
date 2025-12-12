'use client';

import { useState, useEffect } from 'react';

interface PreparingScreenProps {
  countdownFrom?: number;
}

export function PreparingScreen({ countdownFrom = 3 }: PreparingScreenProps) {
  const [count, setCount] = useState(countdownFrom);

  useEffect(() => {
    if (count <= 0) return;

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-background">
      <h1 className="text-4xl font-bold mb-8">Get Ready...</h1>

      {/* Animated countdown number */}
      <div className="relative">
        <div
          key={count}
          className="text-8xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-countdown-pop"
        >
          {count > 0 ? count : 'GO!'}
        </div>
      </div>

      <p className="text-muted-foreground mt-8 text-xl">
        The next question is about to start!
      </p>

      <style jsx>{`
        @keyframes countdown-pop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-countdown-pop {
          animation: countdown-pop 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
