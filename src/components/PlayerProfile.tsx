import React from 'react';
import { motion } from 'motion/react';
import { X, Trophy, MapPin, Shield, Star, Fish, Coins, Globe } from 'lucide-react';

interface Props {
  player: any;
  onClose: () => void;
  isMe?: boolean;
}

export function PlayerProfile({ player, onClose, isMe }: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute inset-0 z-[60] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Background Glow */}
        <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[100px] rounded-full opacity-20 ${player.hasPassport ? 'bg-purple-500' : 'bg-blue-500'}`} />
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-white/40 hover:text-white bg-white/5 rounded-full transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center gap-6 relative z-10">
          {/* Avatar */}
          <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center relative ${player.hasPassport ? 'border-yellow-400 bg-purple-900/50' : 'border-blue-500 bg-blue-900/50'}`}>
            <span className="text-6xl">🎣</span>
            {player.hasPassport && (
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-black p-1.5 rounded-full shadow-lg">
                <Globe size={20} />
              </div>
            )}
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-black text-white flex items-center gap-2 justify-center">
              {player.name}
              {isMe && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">You</span>}
            </h2>
            <p className="text-white/50 font-medium mt-1">Master Angler • Level {player.level}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <StatCard icon={<Trophy size={18} className="text-yellow-400" />} label="Rank" value="#124" />
            <StatCard icon={<Fish size={18} className="text-blue-400" />} label="Catches" value="1,240" />
            <StatCard icon={<Star size={18} className="text-purple-400" />} label="XP" value={player.xp || '4,500'} />
            <StatCard icon={<Coins size={18} className="text-emerald-400" />} label="Coins" value={player.money?.toLocaleString() || '0'} />
          </div>

          {/* Badges/Interactions */}
          <div className="w-full flex flex-col gap-3">
            <h4 className="text-white/30 text-[10px] uppercase font-bold tracking-[0.2em] px-2">Achievements</h4>
            <div className="flex gap-2 px-2">
              <Badge icon={<Shield size={14} />} color="bg-blue-500" />
              <Badge icon={<Globe size={14} />} color="bg-purple-500" />
              <Badge icon={<Star size={14} />} color="bg-yellow-500" />
            </div>
          </div>

          {!isMe && (
            <div className="w-full grid grid-cols-2 gap-3 mt-4">
              <button className="py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10">
                Message
              </button>
              <button className={`py-4 text-white rounded-2xl font-bold transition-all shadow-lg ${player.hasPassport ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                Trade
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-white font-black text-xl">{value}</div>
    </div>
  );
}

function Badge({ icon, color }: { icon: React.ReactNode, color: string }) {
  return (
    <div className={`${color} p-2 rounded-lg text-white shadow-lg`}>
      {icon}
    </div>
  );
}
