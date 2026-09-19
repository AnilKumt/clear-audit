'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { IconType } from 'react-icons';

interface AnimatedIconProps {
  icon: LucideIcon | IconType;
  className?: string;
  animationType?: 'bounce' | 'rotate' | 'pulse' | 'wiggle' | 'scale';
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  icon: Icon,
  className = 'w-4 h-4',
  animationType = 'scale',
}) => {
  const getVariants = (): Variants => {
    switch (animationType) {
      case 'bounce':
        return {
          hover: { y: -3, transition: { type: 'spring' as const, stiffness: 500, damping: 10 } },
        };
      case 'rotate':
        return {
          hover: { rotate: 180, transition: { duration: 0.4 } },
        };
      case 'pulse':
        return {
          hover: { scale: 1.2, transition: { repeat: Infinity, repeatType: 'reverse' as const, duration: 0.4 } },
        };
      case 'wiggle':
        return {
          hover: { rotate: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } },
        };
      case 'scale':
      default:
        return {
          hover: { scale: 1.15, transition: { type: 'spring' as const, stiffness: 400, damping: 15 } },
        };
    }
  };

  return (
    <motion.span
      className="inline-flex items-center justify-center pointer-events-none"
      whileHover="hover"
      variants={getVariants()}
    >
      <Icon className={className} />
    </motion.span>
  );
};
