'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Maximize, Minimize, X, QrCode, Copy } from 'lucide-react';

interface HostOverlayProps {
  gamePin: string;
  currentSlide: number;
  totalSlides: number;
  playerCount: number;
  onCancel?: () => void;
}

export function HostOverlay({
  gamePin,
  currentSlide,
  totalSlides,
  playerCount,
  onCancel,
}: HostOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastMouseMove, setLastMouseMove] = useState(Date.now());
  const [joinUrl, setJoinUrl] = useState('');

  // Build join URL on client
  useEffect(() => {
    if (gamePin) {
      setJoinUrl(`${window.location.origin}/play/${gamePin}`);
    }
  }, [gamePin]);

  // Auto-hide after 3 seconds of no mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      setLastMouseMove(Date.now());
      setIsVisible(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastMouseMove > 3000) {
        setIsVisible(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastMouseMove]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute top-0 left-0 right-0 z-50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
            {/* Left: Game PIN, QR Code, Copy Link */}
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="text-lg font-mono bg-white/20 text-white border-0"
              >
                PIN: {gamePin}
              </Badge>
              <CopyButton text={gamePin} className="text-white hover:bg-white/20" />

              {/* QR Code Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-8 w-8"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-medium">Scan to join</p>
                    {joinUrl && (
                      <div className="bg-white p-3 rounded-lg">
                        <QRCodeSVG value={joinUrl} size={160} level="M" />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground max-w-[200px] truncate">{joinUrl}</p>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Copy Link Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={() => navigator.clipboard.writeText(joinUrl)}
                title="Copy join link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Center: Slide Counter */}
            <Badge
              variant="secondary"
              className="text-sm bg-white/20 text-white border-0"
            >
              {currentSlide} / {totalSlides}
            </Badge>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-sm bg-white/20 text-white border-0"
              >
                <Users className="h-4 w-4 mr-1" />
                {playerCount}
              </Badge>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>

              {onCancel && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-red-500/50"
                  onClick={onCancel}
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
