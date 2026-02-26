import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Fish } from 'lucide-react';

interface Props {
  rodMultiplier: number;
  isMonster?: boolean;
  onCatch: () => void;
  onBreak: () => void;
  onEscape: () => void;
}

export function TensionReeling({ rodMultiplier, isMonster = false, onCatch, onBreak, onEscape }: Props) {
  const [tension, setTension] = useState(50);
  const [distance, setDistance] = useState(isMonster ? 200 : 100); // Monsters start further away
  const [isReeling, setIsReeling] = useState(false);
  
  const tensionRef = useRef(tension);
  const distanceRef = useRef(distance);
  const isReelingRef = useRef(isReeling);
  const lastVibrateRef = useRef(0);
  
  useEffect(() => {
    tensionRef.current = tension;
    distanceRef.current = distance;
    isReelingRef.current = isReeling;

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
  }, [tension, distance, isReeling, isMonster]);

  useEffect(() => {
    const interval = setInterval(() => {
      let currentTension = tensionRef.current;
      let currentDistance = distanceRef.current;
      
      const difficultyScale = isMonster ? 2.5 : 1.0;
      
      // Tension drops naturally if not reeling
      if (!isReelingRef.current) {
        currentTension = Math.max(0, currentTension - (2 * rodMultiplier / difficultyScale));
      } else {
        currentTension = Math.min(100, currentTension + (3 * difficultyScale / rodMultiplier));
      }
      
      // Update distance based on tension
      const sweetSpotMin = isMonster ? 45 : 30;
      const sweetSpotMax = isMonster ? 65 : 80;

      if (currentTension > sweetSpotMin && currentTension < sweetSpotMax) {
        // Sweet spot
        currentDistance = Math.max(0, currentDistance - (1.5 * rodMultiplier / difficultyScale));
      } else if (currentTension < sweetSpotMin) {
        // Too loose, fish escapes
        currentDistance = Math.min(isMonster ? 200 : 100, currentDistance + (isMonster ? 1.0 : 0.5));
      } else if (currentTension >= 100) {
        // Line breaks
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

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 pointer-events-none">
      <div className={`w-full max-w-sm bg-black/50 backdrop-blur-md rounded-2xl p-6 border pointer-events-auto ${isMonster ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'border-white/20'}`}>
        <h2 className={`text-xl font-bold text-center mb-6 ${isMonster ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {isMonster ? '⚠ MONSTER DETECTED ⚠' : 'Reel it in!'}
        </h2>
        
        <div className="mb-6">
          <div className="flex justify-between text-white/80 text-sm mb-2">
            <span>Distance</span>
            <span className={isMonster ? 'text-red-400 font-mono' : ''}>{Math.round(distance)}m</span>
          </div>
          <div className="h-4 bg-white/20 rounded-full overflow-hidden relative">
            <motion.div 
              className={`absolute top-0 bottom-0 right-0 ${isMonster ? 'bg-red-600' : 'bg-blue-500'}`}
              style={{ width: `${(distance / (isMonster ? 200 : 100)) * 100}%` }}
            />
            <motion.div 
              className="absolute top-1/2 -translate-y-1/2 text-white"
              style={{ right: `calc(${(distance / (isMonster ? 200 : 100)) * 100}% - 12px)` }}
            >
              <Fish size={24} className={`scale-x-[-1] ${isMonster ? 'text-red-500' : ''}`} />
            </motion.div>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between text-white/80 text-sm mb-2">
            <span>Tension</span>
            <span className={tension > 80 ? 'text-red-400 font-bold' : ''}>
              {Math.round(tension)}%
            </span>
          </div>
          <div className="h-6 bg-white/20 rounded-full overflow-hidden relative">
            {/* Sweet spot indicator */}
            <div className={`absolute top-0 bottom-0 bg-green-500/30 border-x border-green-500/50 ${isMonster ? 'left-[45%] right-[35%]' : 'left-[30%] right-[20%]'}`} />
            
            <motion.div 
              className={`h-full ${tension > (isMonster ? 65 : 80) ? 'bg-red-500' : tension < (isMonster ? 45 : 30) ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${tension}%` }}
            />
          </div>
          <p className="text-center text-xs text-white/60 mt-2">
            {isMonster ? 'DANGER: EXTREME TENSION' : 'Keep tension in the green zone!'}
          </p>
        </div>
        
        <button
          className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all select-none touch-none ${isMonster ? 'bg-red-600 hover:bg-red-500 active:bg-red-700' : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'}`}
          onPointerDown={() => setIsReeling(true)}
          onPointerUp={() => setIsReeling(false)}
          onPointerLeave={() => setIsReeling(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {isMonster ? 'FIGHT THE BEAST' : 'HOLD TO REEL'}
        </button>
      </div>
    </div>
  );
}
