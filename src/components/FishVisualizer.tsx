import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type: 'bubble' | 'glow';
}

interface Props {
  src?: string;
  video?: string;
  name: string;
  color: string;
  isAction?: boolean;
}

export function FishVisualizer({ src, video, name, color, isAction = true }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isAction) {
      const interval = setInterval(() => {
        const newParticle: Particle = {
          id: Date.now(),
          x: Math.random() * 100,
          y: 80 + Math.random() * 20,
          size: 4 + Math.random() * 8,
          duration: 2 + Math.random() * 3,
          delay: Math.random() * 2,
          type: Math.random() > 0.3 ? 'bubble' : 'glow'
        };
        setParticles(prev => [...prev.slice(-20), newParticle]);
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isAction]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Background Glow */}
      <div 
        className="absolute inset-0 opacity-20 blur-[100px] rounded-full animate-pulse"
        style={{ backgroundColor: color }}
      />

      {/* Particles */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0, y: 0, x: `${p.x}%` }}
            animate={{ 
              opacity: [0, 0.8, 0], 
              scale: [0.5, 1.2, 0.8], 
              y: -400,
              x: `${p.x + (Math.random() * 10 - 5)}%`
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: p.duration, ease: "easeOut" }}
            className="absolute bottom-0 pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: p.type === 'bubble' ? 'rgba(255, 255, 255, 0.4)' : color,
              border: p.type === 'bubble' ? '1px solid rgba(255, 255, 255, 0.6)' : 'none',
              boxShadow: p.type === 'glow' ? `0 0 15px ${color}` : 'none',
              filter: p.type === 'bubble' ? 'blur(1px)' : 'blur(2px)',
            }}
          />
        ))}
      </AnimatePresence>

      {/* Main Fish Content */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full h-full flex items-center justify-center"
      >
        {video ? (
          <video 
            src={video} 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            style={{ filter: 'contrast(1.2) brightness(1.1)' }}
          />
        ) : src ? (
          <img 
            src={src} 
            alt={name} 
            className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]" 
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div 
              className="w-32 h-32 rounded-full animate-bounce shadow-2xl"
              style={{ backgroundColor: color, boxShadow: `0 0 50px ${color}` }}
            />
            <span className="text-white font-black uppercase tracking-tighter text-2xl italic">Reeling in...</span>
          </div>
        )}
      </motion.div>

      {/* Action Overlays */}
      {isAction && (
        <>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-blue-500/10 to-transparent" />
          <motion.div 
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/water.png')] opacity-20" 
          />
        </>
      )}
    </div>
  );
}
