import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fish, Sparkles } from 'lucide-react';

interface CatchEvent {
  id: string;
  playerName: string;
  fishName: string;
  rarity: string;
  timestamp: number;
}

interface Props {
  events: CatchEvent[];
}

export function GlobalTicker({ events }: Props) {
  const [visibleEvents, setVisibleEvents] = useState<CatchEvent[]>([]);

  useEffect(() => {
    // Keep only the last 5 events
    setVisibleEvents(events.slice(-5).reverse());
  }, [events]);

  return (
    <div className="absolute top-20 left-0 right-0 z-[40] pointer-events-none flex flex-col items-center gap-2 px-4">
      <AnimatePresence mode="popLayout">
        {visibleEvents.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-3 shadow-lg"
          >
            <div className={`p-1 rounded-full ${getRarityColor(event.rarity)}`}>
              <Fish size={14} className="text-white" />
            </div>
            <div className="text-xs font-bold flex items-center gap-1.5">
              <span className="text-blue-400">{event.playerName}</span>
              <span className="text-white/60 font-medium">caught a</span>
              <span className={`uppercase tracking-tight ${getRarityTextColor(event.rarity)}`}>
                {event.rarity} {event.fishName}
              </span>
              {event.rarity === 'Legendary' || event.rarity === 'MONSTER' ? (
                <Sparkles size={12} className="text-yellow-400 animate-pulse" />
              ) : null}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getRarityColor(rarity: string) {
  switch (rarity) {
    case 'Common': return 'bg-gray-500';
    case 'Uncommon': return 'bg-green-500';
    case 'Rare': return 'bg-blue-500';
    case 'Epic': return 'bg-purple-500';
    case 'Legendary': return 'bg-yellow-500';
    case 'MONSTER': return 'bg-red-600';
    default: return 'bg-blue-500';
  }
}

function getRarityTextColor(rarity: string) {
  switch (rarity) {
    case 'Common': return 'text-gray-300';
    case 'Uncommon': return 'text-green-400';
    case 'Rare': return 'text-blue-400';
    case 'Epic': return 'text-purple-400';
    case 'Legendary': return 'text-yellow-400';
    case 'MONSTER': return 'text-red-500 font-black';
    default: return 'text-white';
  }
}
