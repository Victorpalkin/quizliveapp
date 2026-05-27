'use client';

import { motion, AnimatePresence } from 'motion/react';
import { WifiOff } from 'lucide-react';

interface ConnectionBannerProps {
  status: 'connected' | 'reconnecting';
}

export function ConnectionBanner({ status }: ConnectionBannerProps) {
  return (
    <AnimatePresence>
      {status === 'reconnecting' && (
        <motion.div
          initial={{ opacity: 0, y: -36 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -36 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium shadow-lg"
        >
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <WifiOff className="h-4 w-4" />
          </motion.div>
          <span>Reconnecting...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
