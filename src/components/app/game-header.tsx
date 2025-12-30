'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QrCode, Copy, Users, XCircle, FileQuestion, Cloud, BarChart3, Keyboard, Presentation, Vote } from 'lucide-react';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { cn } from '@/lib/utils';

export type ActivityType = 'quiz' | 'poll' | 'thoughts-gathering' | 'evaluation' | 'presentation';

interface GameHeaderProps {
  /** The game PIN to display */
  gamePin: string;
  /** Number of players/participants */
  playerCount: number;
  /** Type of activity for styling */
  activityType: ActivityType;
  /** Activity title (optional) */
  title?: string;
  /** Callback when cancel is confirmed */
  onCancel?: () => void;
  /** Whether the game is in a live (non-lobby) state */
  isLive?: boolean;
  /** Show keyboard shortcuts indicator */
  showKeyboardHint?: boolean;
  /** Custom className for the header */
  className?: string;
}

const activityConfig: Record<ActivityType, { icon: React.ElementType; color: string; label: string }> = {
  'quiz': { icon: FileQuestion, color: 'text-purple-500', label: 'Quiz' },
  'poll': { icon: Vote, color: 'text-teal-500', label: 'Poll' },
  'thoughts-gathering': { icon: Cloud, color: 'text-blue-500', label: 'Thoughts Gathering' },
  'evaluation': { icon: BarChart3, color: 'text-orange-500', label: 'Evaluation' },
  'presentation': { icon: Presentation, color: 'text-indigo-500', label: 'Presentation' },
};

/**
 * GameHeader - Shared header component for all live game/lobby pages
 *
 * Provides consistent UI for:
 * - Game PIN display
 * - QR code access
 * - Copy link functionality
 * - Player count
 * - Cancel/End game action
 */
export function GameHeader({
  gamePin,
  playerCount,
  activityType,
  title,
  onCancel,
  isLive = false,
  showKeyboardHint = false,
  className,
}: GameHeaderProps) {
  const [joinUrl, setJoinUrl] = useState('');
  const config = activityConfig[activityType];
  const ActivityIcon = config.icon;

  useEffect(() => {
    if (gamePin) {
      setJoinUrl(`${window.location.origin}/play/${gamePin}`);
    }
  }, [gamePin]);

  return (
    <header className={cn("flex flex-wrap justify-between items-center gap-4 mb-6", className)}>
      {/* Left: Logo and Activity Type */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Zivo</h1>
        <Badge variant="outline" className={cn("gap-1", config.color)}>
          <ActivityIcon className="h-3 w-3" />
          {config.label}
        </Badge>
        {title && (
          <span className="text-muted-foreground text-sm hidden md:inline truncate max-w-[200px]">
            {title}
          </span>
        )}
      </div>

      {/* Center: PIN and Actions */}
      <div className="flex items-center gap-3 order-last sm:order-none w-full sm:w-auto justify-center">
        <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">PIN</span>
          <span className="text-2xl font-mono font-bold tracking-widest">{gamePin}</span>
          <CopyButton text={gamePin} />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <QrCode className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="center">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium">Scan to join</p>
              {joinUrl && (
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG value={joinUrl} size={160} level="M" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">{joinUrl}</p>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={() => navigator.clipboard.writeText(joinUrl)}
          title="Copy join link"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: Player Count and Actions */}
      <div className="flex items-center gap-3">
        {/* Player Count */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{playerCount}</span>
          <span className="text-muted-foreground hidden sm:inline">
            {playerCount === 1 ? 'player' : 'players'}
          </span>
        </div>

        {/* Keyboard Hint */}
        {showKeyboardHint && (
          <Badge variant="secondary" className="hidden md:flex gap-1 text-xs">
            <Keyboard className="h-3 w-3" />
            Space / Esc
          </Badge>
        )}

        <ThemeToggle />

        {/* Cancel Button */}
        {onCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                <XCircle className="mr-1 h-4 w-4" />
                {isLive ? 'End' : 'Cancel'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isLive ? 'End this game?' : 'Cancel this game?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isLive
                    ? 'This will end the game for all players. Final results will be shown.'
                    : 'This will remove all players and cannot be undone.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onCancel}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isLive ? 'Yes, End Game' : 'Yes, Cancel'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </header>
  );
}

/**
 * KeyboardShortcutsHint - Shows available keyboard shortcuts
 */
interface KeyboardShortcutsHintProps {
  shortcuts: { key: string; action: string }[];
  className?: string;
}

export function KeyboardShortcutsHint({ shortcuts, className }: KeyboardShortcutsHintProps) {
  return (
    <div className={cn("flex items-center gap-4 text-xs text-muted-foreground", className)}>
      <Keyboard className="h-4 w-4" />
      <span className="hidden sm:inline">Keyboard:</span>
      {shortcuts.map(({ key, action }) => (
        <span key={key} className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono font-medium">
            {key}
          </kbd>
          <span>{action}</span>
        </span>
      ))}
    </div>
  );
}
