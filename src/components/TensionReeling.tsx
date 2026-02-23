import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Fish } from 'lucide-react';

interface Props {
  rodMultiplier: number;
  onCatch: () => void;
  onBreak: () => void;
  onEscape: () => void;
}

export function TensionReeling({ rodMultiplier, onCatch, onBreak, onEscape }: Props) {
  const [tension, setTension] = useState(50);
  const [distance, setDistance] = useState(100);
  const [isReeling, setIsReeling] = useState(false);
  
  const tensionRef = useRef(tension);
  const distanceRef = useRef(distance);
  const isReelingRef = useRef(isReeling);
  
  useEffect(() => {
    tensionRef.current = tension;
    distanceRef.current = distance;
    isReelingRef.current = isReeling;
  }, [tension, distance, isReeling]);

  useEffect(() => {
    const interval = setInterval(() => {
      let currentTension = tensionRef.current;
      let currentDistance = distanceRef.current;
      
      // Tension drops naturally if not reeling
      if (!isReelingRef.current) {
        currentTension = Math.max(0, currentTension - (2 * rodMultiplier));
      } else {
        currentTension = Math.min(100, currentTension + (3 / rodMultiplier));
      }
      
      // Update distance based on tension
      if (currentTension > 30 && currentTension < 80) {
        // Sweet spot
        currentDistance = Math.max(0, currentDistance - (1.5 * rodMultiplier));
      } else if (currentTension < 30) {
        // Too loose, fish escapes
        currentDistance = Math.min(100, currentDistance + 0.5);
      } else if (currentTension >= 100) {
        // Line breaks
        onBreak();
        clearInterval(interval);
        return;
      }
      
      if (currentDistance >= 100 && currentTension < 10) {
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
  }, [rodMultiplier, onCatch, onBreak, onEscape]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 pointer-events-none">
      <div className="w-full max-w-sm bg-black/50 backdrop-blur-md rounded-2xl p-6 border border-white/20 pointer-events-auto">
        <h2 className="text-white text-xl font-bold text-center mb-6">Reel it in!</h2>
        
        <div className="mb-6">
          <div className="flex justify-between text-white/80 text-sm mb-2">
            <span>Distance</span>
            <span>{Math.round(distance)}m</span>
          </div>
          <div className="h-4 bg-white/20 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute top-0 bottom-0 right-0 bg-blue-500"
              style={{ width: `${distance}%` }}
            />
            <motion.div 
              className="absolute top-1/2 -translate-y-1/2 text-white"
              style={{ right: `calc(${distance}% - 12px)` }}
            >
              <Fish size={24} className="scale-x-[-1]" />
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
            <div className="absolute top-0 bottom-0 left-[30%] right-[20%] bg-green-500/30 border-x border-green-500/50" />
            
            <motion.div 
              className={`h-full ${tension > 80 ? 'bg-red-500' : tension < 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${tension}%` }}
            />
          </div>
          <p className="text-center text-xs text-white/60 mt-2">
            Keep tension in the green zone!
          </p>
        </div>
        
        <button
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all select-none touch-none"
          onPointerDown={() => setIsReeling(true)}
          onPointerUp={() => setIsReeling(false)}
          onPointerLeave={() => setIsReeling(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          HOLD TO REEL
        </button>
      </div>
    </div>
  );
}
