import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Trophy, Globe, MapPin, Medal } from 'lucide-react';
import { FishData } from '../types';

interface Props {
  fishdex: FishData[];
  onClose: () => void;
}

export function Leaderboard({ fishdex, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'local' | 'global'>('local');
  const [globalMock, setGlobalMock] = useState<any[]>([]);

  useEffect(() => {
    // Generate some mock global leaderboard data
    setGlobalMock([
      { name: 'AnglerPro99', fish: 'Blue Marlin', weight: 450.2, score: 50000 },
      { name: 'RiverKing', fish: 'Goliath Tigerfish', weight: 68.5, score: 45000 },
      { name: 'DeepSeaDiver', fish: 'Giant Squid', weight: 200.0, score: 42000 },
      { name: 'BassMaster', fish: 'Largemouth Bass', weight: 10.1, score: 15000 },
      { name: 'CasualFisher', fish: 'Rainbow Trout', weight: 4.5, score: 5000 },
    ]);
  }, []);

  // Sort local fish by price/score
  const localTop = [...fishdex].sort((a, b) => b.price - a.price).slice(0, 10);

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-zinc-950 flex flex-col"
    >
      <div className="p-4 flex justify-between items-center border-b border-white/10 bg-zinc-900">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy size={24} className="text-yellow-400" />
          Rankings
        </h2>
        <button 
          onClick={onClose}
          className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex p-2 gap-2 bg-zinc-900 border-b border-white/5 shrink-0">
        <button 
          onClick={() => setActiveTab('local')}
          className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'local' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
        >
          <MapPin size={16} />
          My Top Catches
        </button>
        <button 
          onClick={() => setActiveTab('global')}
          className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'global' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
        >
          <Globe size={16} />
          Global
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'local' ? (
          localTop.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/40">
              <p>No catches yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {localTop.map((fish, i) => (
                <div key={fish.id} className="bg-zinc-800/50 border border-white/10 rounded-xl p-3 flex items-center gap-4">
                  <div className="w-8 text-center font-bold text-white/50">#{i + 1}</div>
                  <div className="w-12 h-12 bg-black/50 rounded-lg overflow-hidden flex-shrink-0">
                    {fish.image ? (
                      <img src={fish.image} alt={fish.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${fish.color}40` }}>
                        <span className="text-2xl" style={{ color: fish.color }}>🐟</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold truncate">{fish.name}</h4>
                    <div className="flex gap-2 text-xs text-white/50">
                      <span>{fish.weightKg}kg</span>
                      <span className="uppercase" style={{ color: fish.color }}>{fish.rarity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold text-sm">{fish.price} pts</div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {globalMock.map((entry, i) => (
              <div key={i} className="bg-zinc-800/50 border border-white/10 rounded-xl p-3 flex items-center gap-4">
                <div className="w-8 flex justify-center">
                  {i === 0 ? <Medal size={20} className="text-yellow-400" /> :
                   i === 1 ? <Medal size={20} className="text-gray-400" /> :
                   i === 2 ? <Medal size={20} className="text-amber-600" /> :
                   <span className="font-bold text-white/50">#{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-bold truncate">{entry.name}</h4>
                  <div className="text-xs text-white/50 truncate">Caught: {entry.fish} ({entry.weight}kg)</div>
                </div>
                <div className="text-right">
                  <div className="text-blue-400 font-bold text-sm">{entry.score} pts</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
