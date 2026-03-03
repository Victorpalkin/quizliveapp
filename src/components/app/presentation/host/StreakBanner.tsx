'use client';

interface StreakBannerProps {
  playerName: string;
  streak: number;
}

export function StreakBanner({ playerName, streak }: StreakBannerProps) {
  if (streak < 3) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg animate-bounce">
      {playerName} is on a {streak}-streak!
    </div>
  );
}
