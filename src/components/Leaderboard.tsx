import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Trophy, Globe, MapPin, Medal, Target, Coins } from 'lucide-react';
import { FishData } from '../types';

interface Props {
  fishdex: FishData[];
  onClose: () => void;
}

export function Leaderboard({ fishdex, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'local' | 'global' | 'tournament'>('local');
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
      className="absolute inset-0 z-50 bg-[#050a14] flex flex-col"
    >
      <div className="p-4 flex justify-between items-center border-b border-white/10 glass-panel">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 title-font">
          <Trophy size={24} className="text-yellow-300" />
          Rankings & Events
        </h2>
        <button 
          onClick={onClose}
          className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex p-2 gap-2 glass-panel border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('local')}
          className={`flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'local' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/60'}`}
        >
          <MapPin size={16} />
          My Top
        </button>
        <button 
          onClick={() => setActiveTab('global')}
          className={`flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'global' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/60'}`}
        >
          <Globe size={16} />
          Global
        </button>
        <button 
          onClick={() => setActiveTab('tournament')}
          className={`flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'tournament' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/60'}`}
        >
          <Target size={16} />
          Tournaments
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
                <div key={fish.id} className="glass-panel rounded-xl p-3 flex items-center gap-4">
                  <div className="w-8 text-center font-bold text-white/50">#{i + 1}</div>
                  <div className="w-12 h-12 bg-black/50 rounded-lg overflow-hidden flex-shrink-0">
                    {fish.image ? (
                      <img src={fish.image} alt={fish.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${fish.color}40` }}>
                        <span className="text-xs font-bold" style={{ color: fish.color }}>Fish</span>
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
        ) : activeTab === 'global' ? (
          <div className="flex flex-col gap-3">
            {globalMock.map((entry, i) => (
              <div key={i} className="glass-panel rounded-xl p-3 flex items-center gap-4">
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
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider bg-purple-500/20 px-2 py-1 rounded-md">Active Event</span>
                  <h3 className="text-white font-black text-xl mt-2">Lake Monster Hunt</h3>
                  <p className="text-white/60 text-sm mt-1">Catch a Legendary fish in any lake.</p>
                </div>
                <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-2 text-center">
                  <div className="text-xs text-yellow-400/70 font-bold uppercase mb-1">Prize</div>
                  <div className="flex items-center gap-1 text-yellow-400 font-black">
                    <Coins size={16} />
                    50,000
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between text-xs text-white/50 mb-1 font-bold">
                  <span>Progress</span>
                  <span>0 / 1</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-0 rounded-full" />
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider bg-blue-500/20 px-2 py-1 rounded-md">Daily Challenge</span>
                  <h3 className="text-white font-black text-xl mt-2">Weight Watcher</h3>
                  <p className="text-white/60 text-sm mt-1">Catch 50kg total weight of fish.</p>
                </div>
                <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-2 text-center">
                  <div className="text-xs text-yellow-400/70 font-bold uppercase mb-1">Prize</div>
                  <div className="flex items-center gap-1 text-yellow-400 font-black">
                    <Coins size={16} />
                    5,000
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-white/50 mb-1 font-bold">
                  <span>Progress</span>
                  <span>{Math.round(fishdex.reduce((acc, f) => acc + f.weightKg, 0))} / 50 kg</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, (fishdex.reduce((acc, f) => acc + f.weightKg, 0) / 50) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
