import { motion } from 'motion/react';
import { X, Calendar, Coins, Target, Trophy, Fish } from 'lucide-react';
import { PlayerState } from '../types';

interface Props {
  playerState: PlayerState;
  onClose: () => void;
  canClaimDaily: boolean;
  onClaimDaily: () => void;
  dailyRewardAmount: number;
  milestoneTarget: number;
  milestoneProgress: number;
  milestoneReward: number;
  isNearTournament: boolean;
}

export function MissionBoard({
  playerState,
  onClose,
  canClaimDaily,
  onClaimDaily,
  dailyRewardAmount,
  milestoneTarget,
  milestoneProgress,
  milestoneReward,
  isNearTournament
}: Props) {
  const quest = playerState.dailyQuest;
  const questProgressPercent = Math.min(100, (quest.progress / quest.target) * 100);
  const milestonePercent = Math.min(100, (milestoneProgress / milestoneTarget) * 100);

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
          <Target size={24} className="text-cyan-300" />
          Mission Board
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white">
              <Calendar size={18} className="text-amber-300" />
              <span className="font-bold">Daily Reward</span>
            </div>
            <button
              onClick={onClaimDaily}
              disabled={!canClaimDaily}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${canClaimDaily ? 'bg-amber-400 text-black' : 'bg-white/5 text-white/40 cursor-not-allowed'}`}
            >
              {canClaimDaily ? 'Claim' : 'Claimed'}
            </button>
          </div>
          <div className="text-sm text-white/70">
            Reward: <span className="text-amber-200 font-bold">{dailyRewardAmount}</span> coins
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 text-white mb-2">
            <Trophy size={18} className="text-emerald-300" />
            <span className="font-bold">Daily Quest</span>
          </div>
          <div className="text-xs text-white/60 mb-2">
            Catch {quest.target} fish today
          </div>
          <div className="flex justify-between text-xs text-white/60 mb-1">
            <span>{quest.progress}/{quest.target}</span>
            <span>{quest.complete ? 'Complete' : 'In progress'}</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${questProgressPercent}%` }} />
          </div>
          <div className="text-[11px] text-white/50 mt-2">
            Reward: {quest.reward} coins
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 text-white mb-2">
            <Fish size={18} className="text-cyan-300" />
            <span className="font-bold">Lifetime Milestone</span>
          </div>
          <div className="text-xs text-white/60">
            Total catches: {playerState.lifetimeCatches}
          </div>
          <div className="text-xs text-white/60">
            Total weight: {playerState.lifetimeWeightKg.toFixed(1)} kg
          </div>
          <div className="flex justify-between text-xs text-white/60 mt-2 mb-1">
            <span>Next: {milestoneTarget} catches</span>
            <span>{milestoneProgress}/{milestoneTarget}</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400" style={{ width: `${milestonePercent}%` }} />
          </div>
          <div className="text-[11px] text-white/50 mt-2">
            Reward: {milestoneReward} coins at {milestoneTarget} catches
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 text-white mb-2">
            <Coins size={18} className="text-yellow-300" />
            <span className="font-bold">Tournament Status</span>
          </div>
          <div className="text-xs text-white/60">
            {isNearTournament ? 'Active: 2x rewards while in zone.' : 'Find a tournament zone to activate 2x rewards.'}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
