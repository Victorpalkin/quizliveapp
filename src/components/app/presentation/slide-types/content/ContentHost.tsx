'use client';

import { motion } from 'motion/react';
import NextImage from 'next/image';
import { SlideHostProps } from '../types';

export function ContentHost({ slide }: SlideHostProps) {
  const hasImage = !!slide.imageUrl;
  const hasTitle = !!slide.title;
  const hasDescription = !!slide.description;
  const hasTextContent = hasTitle || hasDescription;

  return (
    <motion.div
      className="w-full h-full flex items-center justify-center"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {hasImage ? (
        <div className="relative w-full h-full">
          <NextImage
            src={slide.imageUrl!}
            alt={slide.title || 'Slide content'}
            fill
            className="object-contain"
            priority
          />
          {hasTextContent && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {hasTitle && (
                <h1 className="text-4xl font-bold text-white mb-2">
                  {slide.title}
                </h1>
              )}
              {hasDescription && (
                <p className="text-xl text-white/90">
                  {slide.description}
                </p>
              )}
            </motion.div>
          )}
        </div>
      ) : hasTextContent ? (
        <motion.div
          className="text-center max-w-4xl px-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {hasTitle && (
            <h1 className="text-6xl font-bold text-foreground mb-6">
              {slide.title}
            </h1>
          )}
          {hasDescription && (
            <p className="text-2xl text-muted-foreground whitespace-pre-wrap">
              {slide.description}
            </p>
          )}
        </motion.div>
      ) : (
        <div className="text-center text-muted-foreground">
          <p className="text-xl">Empty slide</p>
          <p className="text-sm">Add content in the editor</p>
        </div>
      )}
    </motion.div>
  );
}
