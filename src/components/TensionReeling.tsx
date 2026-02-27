import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fish, AlertTriangle } from 'lucide-react';

interface Props {
  rodMultiplier: number;
  isMonster?: boolean;
  onCatch: () => void;
  onBreak: () => void;
  onEscape: () => void;
  onTensionChange?: (tension: number) => void;
}

export function TensionReeling({ rodMultiplier, isMonster = false, onCatch, onBreak, onEscape, onTensionChange }: Props) {
  const [tension, setTension] = useState(50);
  const [distance, setDistance] = useState(isMonster ? 200 : 100);
  const [isReeling, setIsReeling] = useState(false);
  
  const tensionRef = useRef(tension);
  const distanceRef = useRef(distance);
  const isReelingRef = useRef(isReeling);
  const lastVibrateRef = useRef(0);
  
  useEffect(() => {
    tensionRef.current = tension;
    distanceRef.current = distance;
    isReelingRef.current = isReeling;
    
    if (onTensionChange) {
      onTensionChange(tension / 100);
    }

    // Haptic feedback
    const now = Date.now();
    if (now - lastVibrateRef.current > (isMonster ? 80 : 150)) {
      if (tension > 85 && navigator.vibrate) {
        navigator.vibrate(isMonster ? [100, 50, 100] : 60);
        lastVibrateRef.current = now;
      } else if (isReeling && navigator.vibrate) {
        navigator.vibrate(isMonster ? 60 : 30);
        lastVibrateRef.current = now;
      }
    }
  }, [tension, distance, isReeling, isMonster, onTensionChange]);

  useEffect(() => {
    const interval = setInterval(() => {
      let currentTension = tensionRef.current;
      let currentDistance = distanceRef.current;
      
      const difficultyScale = isMonster ? 2.5 : 1.0;
      
      if (!isReelingRef.current) {
        currentTension = Math.max(0, currentTension - (2 * rodMultiplier / difficultyScale));
      } else {
        currentTension = Math.min(100, currentTension + (3 * difficultyScale / rodMultiplier));
      }
      
      const sweetSpotMin = isMonster ? 45 : 30;
      const sweetSpotMax = isMonster ? 65 : 80;

      if (currentTension > sweetSpotMin && currentTension < sweetSpotMax) {
        currentDistance = Math.max(0, currentDistance - (1.5 * rodMultiplier / difficultyScale));
      } else if (currentTension < sweetSpotMin) {
        currentDistance = Math.min(isMonster ? 200 : 100, currentDistance + (isMonster ? 1.0 : 0.5));
      } else if (currentTension >= 100) {
        onBreak();
        clearInterval(interval);
        return;
      }
      
      if (currentDistance >= (isMonster ? 200 : 100) && currentTension < 5) {
        onEscape();
        clearInterval(interval);
        return;
      }
      
      if (currentDistance <= 0) {
        onCatch();
        clearInterval(interval);
        return;
      }
      
      setTension(currentTension);
      setDistance(currentDistance);
    }, 50);
    
    return () => clearInterval(interval);
  }, [rodMultiplier, isMonster, onCatch, onBreak, onEscape]);

  // Calculate rotation for needle (from -120 to 120 degrees)
  const rotation = (tension / 100) * 240 - 120;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-24 pointer-events-none">
      {/* Circular Tension Meter */}
      <div className="relative w-64 h-64 mb-12">
        {/* Background Ring */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Outer Ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="8"
            className="backdrop-blur-md"
          />
          
          {/* Zones */}
          {/* Green Zone (Safe) */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            strokeDasharray={`${(isMonster ? 20 : 50) * 2.82} 282`}
            strokeDashoffset={`${-(isMonster ? 45 : 30) * 2.82}`}
            className="opacity-40"
          />
          
          {/* Red Zone (Danger) */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#ef4444"
            strokeWidth="8"
            strokeDasharray={`${20 * 2.82} 282`}
            strokeDashoffset={`${-80 * 2.82}`}
            className="opacity-40"
          />

          {/* Current Tension Arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={tension > 80 ? '#ef4444' : tension < 30 ? '#eab308' : '#10b981'}
            strokeWidth="4"
            strokeDasharray={`${tension * 2.82} 282`}
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        </svg>

        {/* Needle */}
        <div 
          className="absolute top-1/2 left-1/2 w-1 h-32 -mt-32 origin-bottom transition-transform duration-75"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        >
          <div className="w-full h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
        </div>

        {/* Center Info */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <AnimatePresence>
            {isMonster && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-500 mb-1"
              >
                <AlertTriangle size={24} className="animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-3xl font-black tracking-tighter drop-shadow-md">
            {Math.round(distance)}m
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
            Distance
          </span>
        </div>

        {/* Hooked Text */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-full text-center">
          <motion.h2 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="text-2xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          >
            HOOKED!
          </motion.h2>
        </div>
      </div>
      
      {/* Reel Button */}
      <div className="pointer-events-auto">
        <button
          className={`w-32 h-32 rounded-full flex items-center justify-center text-white font-black text-xl italic tracking-tighter shadow-2xl active:scale-90 transition-all select-none touch-none border-4 border-white/20
            ${isMonster ? 'bg-gradient-to-br from-red-600 to-red-900' : 'bg-gradient-to-br from-purple-500 to-pink-600'}`}
          onPointerDown={() => setIsReeling(true)}
          onPointerUp={() => setIsReeling(false)}
          onPointerLeave={() => setIsReeling(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center">
            <Fish size={32} className="mb-1" />
            REEL
          </div>
        </button>
      </div>
    </div>
  );
}
