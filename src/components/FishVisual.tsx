import React from 'react';
import { motion } from 'motion/react';
import { Fish } from 'lucide-react';

interface Props {
  rarity: string;
  color: string;
  size?: number;
}

export function FishVisual({ rarity, color, size = 64 }: Props) {
  const isLegendary = rarity.toLowerCase() === 'legendary';
  const isEpic = rarity.toLowerCase() === 'epic';
  const isRare = rarity.toLowerCase() === 'rare';

  return (
    <div className="relative flex items-center justify-center">
      {/* Aura for Legendary/Epic */}
      {(isLegendary || isEpic) && (
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`absolute w-full h-full rounded-full blur-2xl ${isLegendary ? 'bg-yellow-400' : 'bg-purple-500'}`}
        />
      )}

      {/* Sparkles for Legendary */}
      {isLegendary && (
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                x: [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 100],
                y: [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 100],
              }}
              transition={{
                duration: 1.5 + Math.random(),
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]"
            />
          ))}
        </div>
      )}

      <motion.div
        animate={{
          x: isLegendary ? [-8, 8, -8] : isEpic ? [-4, 4, -4] : [-2, 2, -2],
          y: isLegendary ? [-5, 5, -5] : isEpic ? [-3, 3, -3] : [-1, 1, -1],
          rotate: isLegendary ? [-10, 10, -10] : isEpic ? [-5, 5, -5] : 0,
          scale: isLegendary ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: isLegendary ? 0.4 : isEpic ? 0.8 : 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ color }}
        className="relative z-10"
      >
        <Fish size={size} className={isRare ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''} />
      </motion.div>
    </div>
  );
}
