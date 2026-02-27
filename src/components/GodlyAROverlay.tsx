import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Point {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
}

type GameState = 'MAP' | 'CAMERA' | 'SCANNING' | 'READY' | 'WAITING' | 'BITING' | 'REELING' | 'CAUGHT' | 'BROKEN' | 'ESCAPED';

interface GodlyAROverlayProps {
  state: GameState;
  tension: number;
  rodTipPos: { x: number, y: number };
  bobberPos: { x: number, y: number } | null;
  isUnderwater?: boolean;
}

export function GodlyAROverlay({ state, tension, rodTipPos, bobberPos, isUnderwater }: GodlyAROverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<Point[]>([]);
  const [ripples, setRipples] = useState<{ id: number, x: number, y: number }[]>([]);
  const rippleId = useRef(0);

  // Verlet Physics for Fishing Line
  useEffect(() => {
    if (!bobberPos) {
      points.current = [];
      return;
    }

    const segmentCount = 15;
    const newPoints: Point[] = [];
    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const x = rodTipPos.x + (bobberPos.x - rodTipPos.x) * t;
      const y = rodTipPos.y + (bobberPos.y - rodTipPos.y) * t;
      newPoints.push({ x, y, oldX: x, oldY: y });
    }
    points.current = newPoints;

    let animationFrame: number;
    const update = () => {
      if (points.current.length === 0) return;

      const gravity = 0.5;
      const friction = 0.98;
      const iterations = 5;

      // Update positions
      for (let i = 1; i < points.current.length - 1; i++) {
        const p = points.current[i];
        const vx = (p.x - p.oldX) * friction;
        const vy = (p.y - p.oldY) * friction;

        p.oldX = p.x;
        p.oldY = p.y;
        p.x += vx;
        p.y += vy + gravity;
      }

      // Constraints
      for (let j = 0; j < iterations; j++) {
        points.current[0].x = rodTipPos.x;
        points.current[0].y = rodTipPos.y;
        points.current[points.current.length - 1].x = bobberPos.x;
        points.current[points.current.length - 1].y = bobberPos.y;

        for (let i = 0; i < points.current.length - 1; i++) {
          const p1 = points.current[i];
          const p2 = points.current[i + 1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const targetDist = 20; // Ideal segment length
          const difference = (targetDist - distance) / distance;
          const offsetX = dx * difference * 0.5;
          const offsetY = dy * difference * 0.5;

          if (i !== 0) {
            p1.x -= offsetX;
            p1.y -= offsetY;
          }
          if (i !== points.current.length - 2) {
            p2.x += offsetX;
            p2.y += offsetY;
          }
        }
      }

      // Draw
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.beginPath();
          ctx.moveTo(points.current[0].x, points.current[0].y);
          for (let i = 1; i < points.current.length; i++) {
            ctx.lineTo(points.current[i].x, points.current[i].y);
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + tension * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash(state === 'WAITING' ? [5, 5] : []);
          ctx.stroke();

          // Draw tension glow
          if (tension > 0.7) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = tension > 0.9 ? 'red' : 'orange';
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }

      animationFrame = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationFrame);
  }, [bobberPos, rodTipPos, tension, state]);

  // Ripple Effect
  useEffect(() => {
    if (state === 'WAITING' || state === 'BITING' || state === 'REELING') {
      const interval = setInterval(() => {
        if (bobberPos) {
          const id = rippleId.current++;
          setRipples(prev => [...prev, { id, x: bobberPos.x, y: bobberPos.y }]);
          setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== id));
          }, 2000);
        }
      }, state === 'BITING' ? 300 : 1000);
      return () => clearInterval(interval);
    }
  }, [state, bobberPos]);

  // Haptic Feedback
  useEffect(() => {
    if (state === 'BITING' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    if (tension > 0.9 && navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [state, tension]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {/* Canvas for Verlet Line */}
      <canvas 
        ref={canvasRef} 
        width={window.innerWidth} 
        height={window.innerHeight}
        className="absolute inset-0"
      />

      {/* Ripples */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: 40,
              height: 20,
              marginLeft: -20,
              marginTop: -10,
              border: '2px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '50%',
              transform: 'rotateX(60deg)'
            }}
          />
        ))}
      </AnimatePresence>

      {/* Underwater Distortion Filter (SVG) */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="underwater">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="3" result="noise">
            <animate attributeName="baseFrequency" values="0.02 0.05; 0.03 0.07; 0.02 0.05" dur="5s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" />
        </filter>
      </svg>

      {/* Global CSS for the filter */}
      <style>{`
        .underwater-effect {
          filter: url(#underwater) brightness(0.8) contrast(1.2) saturate(1.2);
          mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
        }
        @keyframes monster-swim {
          from { transform: translateX(-100%) rotateY(0deg); }
          to { transform: translateX(100%) rotateY(0deg); }
        }
      `}</style>
    </div>
  );
}
