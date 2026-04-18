'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Users, QrCode, X, GripVertical } from 'lucide-react';

interface HostOverlayProps {
  gamePin: string;
  slideIndex: number;
  totalSlides: number;
  playerCount: number;
}

export function HostOverlay({ gamePin, slideIndex, totalSlides, playerCount }: HostOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [qrVisible, setQrVisible] = useState(true);
  const [joinUrl, setJoinUrl] = useState('');
  const [qrSize, setQrSize] = useState(96);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const constraintsRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startSize = qrSize;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setQrSize(Math.max(64, Math.min(256, startSize + delta)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [qrSize]);

  useEffect(() => {
    if (gamePin) {
      setJoinUrl(`${window.location.origin}/play/${gamePin}`);
    }
  }, [gamePin]);

  // Single function to show overlay and reset the shared hide timer
  const showOverlay = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 4000);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  // Show briefly when slide changes
  useEffect(() => {
    showOverlay();
  }, [slideIndex, showOverlay]);

  // Show when mouse enters top zone
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (e.clientY <= 80) {
        showOverlay();
      }
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [showOverlay]);

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
            {/* PIN + QR toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-60 uppercase tracking-wider">Pin</span>
                <span className="font-mono font-bold text-lg tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                  {gamePin}
                </span>
              </div>
              <button
                onClick={() => setQrVisible((v) => !v)}
                className={`p-1 rounded transition-colors ${qrVisible ? 'bg-white/20' : 'hover:bg-white/10'}`}
                title={qrVisible ? 'Hide QR code' : 'Show QR code'}
              >
                <QrCode className="h-4 w-4" />
              </button>
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

      {/* Floating QR code — persists independently of the overlay bar */}
      <div ref={constraintsRef} className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {qrVisible && joinUrl && (
            <motion.div
              drag
              dragConstraints={constraintsRef}
              dragMomentum={false}
              dragElastic={0}
              whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-20 left-4 backdrop-blur-xl bg-black/40 rounded-xl p-3 border border-white/10 cursor-grab relative w-fit pointer-events-auto"
              data-controls
            >
              <button
                onClick={() => setQrVisible(false)}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute top-1.5 right-1.5 z-10 p-1 rounded-full bg-black/40 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-white" />
              </button>
              <p className="text-center text-white text-xs font-medium mb-1.5 opacity-80">Join Here</p>
              <div className="bg-white p-2 rounded-lg" style={{ width: qrSize + 16, height: qrSize + 16 }}>
                <QRCodeSVG value={joinUrl} size={qrSize} level="M" />
              </div>
              <div className="text-center text-white mt-1.5">
                <p className="font-mono font-bold text-sm tracking-wider">{gamePin}</p>
              </div>
              <div
                onMouseDown={handleResizeStart}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute bottom-1 right-1 cursor-se-resize p-1 opacity-40 hover:opacity-80 transition-opacity"
              >
                <GripVertical className="h-3 w-3 text-white rotate-[-45deg]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
