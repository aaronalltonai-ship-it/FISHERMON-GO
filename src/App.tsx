import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Camera as CameraIcon, MapPin, ShoppingBag, Trophy, Fish, Sparkles, Coins, Gift, Waves, Zap } from 'lucide-react';
import { Camera, CameraRef } from './components/Camera';
import { MapView } from './components/MapView';
import { Shop } from './components/Shop';
import { Leaderboard } from './components/Leaderboard';
import { MapSpots } from './components/MapSpots';
import { TensionReeling } from './components/TensionReeling';
import { FishVisual } from './components/FishVisual';
import { MissionBoard } from './components/MissionBoard';
import { detectWater, generateFishStats, generateFishImage, generateFishVideo, pollVideoOperation, getDownloadUrl } from './lib/gemini';
import { SHOP_ITEMS } from './constants';
import { FishData, PlayerState, DailyQuest } from './types';

const todayKey = () => new Date().toISOString().slice(0, 10);

const buildDailyQuest = (level: number): DailyQuest => {
  const target = Math.min(12, 4 + level);
  const reward = 150 + level * 50;
  return {
    date: todayKey(),
    target,
    progress: 0,
    reward,
    complete: false
  };
};

const initialPlayerState: PlayerState = {
  money: 500,
  level: 1,
  xp: 0,
  streak: 0,
  lastWaterType: undefined,
  dailyRewardLastClaim: undefined,
  dailyQuest: buildDailyQuest(1),
  lifetimeCatches: 0,
  lifetimeWeightKg: 0,
  inventory: {
    rods: ['rod_basic'],
    lures: ['lure_none'],
    baits: ['bait_bread'],
    boats: ['boat_none'],
    chum: 1,
  },
  equipped: {
    rod: 'rod_basic',
    lure: 'lure_none',
    bait: 'bait_bread',
    boat: 'boat_none',
  },
  rodCustomization: {
    rod_basic: { color: '#ffffff', decal: 'none' }
  },
  licenseExpiry: Date.now() + 1000 * 60 * 60 * 24 * 30
};

const defaultSpots = [
  { lat: 37.7749, lng: -122.4194, name: 'Market Pier', type: 'saltwater' },
  { lat: 37.7694, lng: -122.4862, name: 'Golden Gate Lake', type: 'lake' },
  { lat: 37.7599, lng: -122.4148, name: 'Mission Creek', type: 'river' },
  { lat: 37.8078, lng: -122.4101, name: 'Bay Cove', type: 'ocean' },
];

export default function App() {
  const [playerState, setPlayerState] = useState<PlayerState>(initialPlayerState);
  const [fishdex, setFishdex] = useState<FishData[]>([]);
  const [currentFish, setCurrentFish] = useState<FishData | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready to scan for water.');
  const [waterResult, setWaterResult] = useState<{ hasWater: boolean; waterType: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isFishing, setIsFishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMapSpots, setShowMapSpots] = useState(false);
  const [showMissionBoard, setShowMissionBoard] = useState(false);
  const [isNearBaitShop, setIsNearBaitShop] = useState(false);
  const [isNearTournament, setIsNearTournament] = useState(false);
  const [chumBoost, setChumBoost] = useState(false);

  const cameraRef = useRef<CameraRef>(null);

  useEffect(() => {
    setPlayerState(prev => {
      if (prev.dailyQuest.date !== todayKey()) {
        return { ...prev, dailyQuest: buildDailyQuest(prev.level) };
      }
      return prev;
    });
  }, []);

  const canClaimDaily = playerState.dailyRewardLastClaim !== todayKey();
  const dailyRewardAmount = 150 + playerState.streak * 25;

  const rodMultiplier = useMemo(() => {
    const rodItem = SHOP_ITEMS.rods.find(r => r.id === playerState.equipped.rod);
    return rodItem?.multiplier ?? 1;
  }, [playerState.equipped.rod]);

  const milestoneTarget = useMemo(() => {
    const tiers = [10, 25, 50, 100, 200, 500, 1000];
    return tiers.find(t => t > playerState.lifetimeCatches) ?? 1000;
  }, [playerState.lifetimeCatches]);

  const milestoneReward = milestoneTarget * 20;
  const milestoneProgress = playerState.lifetimeCatches;

  const resolveItemName = (category: keyof typeof SHOP_ITEMS, id: string) => {
    const item = SHOP_ITEMS[category].find((entry: any) => entry.id === id);
    return item?.name ?? id;
  };

  const handleClaimDaily = () => {
    if (!canClaimDaily) return;
    setPlayerState(prev => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newStreak = prev.dailyRewardLastClaim === yesterday ? prev.streak + 1 : 1;
      return {
        ...prev,
        streak: newStreak,
        dailyRewardLastClaim: todayKey(),
        money: prev.money + dailyRewardAmount
      };
    });
    setStatus(`Daily reward claimed: +${dailyRewardAmount} coins`);
  };

  const handleScanWater = async () => {
    if (isScanning) return;
    const frame = cameraRef.current?.captureFrame();
    if (!frame) {
      setStatus('Camera not ready. Try again.');
      return;
    }
    setIsScanning(true);
    setStatus('Scanning for water...');
    try {
      const res = await detectWater(frame);
      setWaterResult(res);
      setPlayerState(prev => ({ ...prev, lastWaterType: res.waterType }));
      if (res.hasWater) {
        setStatus(`Water detected: ${res.waterType}`);
      } else {
        setStatus('No water detected. Try another angle.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Scan failed. Check network or API key.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleUseChum = () => {
    if (playerState.inventory.chum <= 0) return;
    setPlayerState(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        chum: prev.inventory.chum - 1
      }
    }));
    setChumBoost(true);
    setStatus('Chum deployed! Next catch boosted.');
  };

  const handleCastLine = () => {
    if (!waterResult?.hasWater) {
      setStatus('Scan water before casting.');
      return;
    }
    if (isFishing) return;
    setIsFishing(true);
    setStatus('Hooked! Keep the tension steady.');
  };

  const handleCatch = async () => {
    setIsFishing(false);
    setIsGenerating(true);
    const waterType = waterResult?.waterType || playerState.lastWaterType || 'lake';
    const lureName = resolveItemName('lures', playerState.equipped.lure);
    const baitName = resolveItemName('baits', playerState.equipped.bait);
    const boatName = resolveItemName('boats', playerState.equipped.boat);

    try {
      const stats = await generateFishStats(waterType, lureName, baitName, boatName);
      const id = `${Date.now()}-${Math.round(Math.random() * 10000)}`;
      const baseReward = Math.round(stats.price * (isNearTournament ? 2 : 1) * (chumBoost ? 1.25 : 1));
      const xpGain = Math.max(5, Math.round(baseReward / 12));

      const fish: FishData = {
        id,
        name: stats.name,
        description: stats.description,
        rarity: stats.rarity,
        weightKg: stats.weightKg,
        lengthCm: stats.lengthCm,
        color: stats.color,
        price: baseReward,
        caughtAt: Date.now()
      };

      setFishdex(prev => [fish, ...prev]);
      setCurrentFish(fish);
      setVideoUrl(null);

      setPlayerState(prev => {
        let level = prev.level;
        let xp = prev.xp + xpGain;
        let xpCap = 120 + (level - 1) * 40;
        while (xp >= xpCap) {
          xp -= xpCap;
          level += 1;
          xpCap = 120 + (level - 1) * 40;
        }

        let questReward = 0;
        let questToStore = prev.dailyQuest;
        if (prev.dailyQuest.date !== todayKey()) {
          questToStore = buildDailyQuest(level);
        }

        const questProgress = { ...questToStore, progress: questToStore.progress + 1 };
        if (!questProgress.complete && questProgress.progress >= questProgress.target) {
          questProgress.complete = true;
          questReward = questProgress.reward;
        }

        return {
          ...prev,
          money: prev.money + baseReward + questReward,
          xp,
          level,
          dailyQuest: questProgress,
          lifetimeCatches: prev.lifetimeCatches + 1,
          lifetimeWeightKg: prev.lifetimeWeightKg + stats.weightKg
        };
      });

      setStatus(`Caught ${stats.name}! +${baseReward} coins`);

      try {
        const image = await generateFishImage(stats.name, waterType, stats.color);
        if (image) {
          setFishdex(prev => prev.map(f => f.id === id ? { ...f, image } : f));
          setCurrentFish(prev => prev && prev.id === id ? { ...prev, image } : prev);
        }
      } catch (imgErr) {
        console.warn('Fish image generation failed', imgErr);
      }
    } catch (err) {
      console.error(err);
      setStatus('Failed to generate fish. Check API key.');
    } finally {
      setIsGenerating(false);
      setChumBoost(false);
    }
  };

  const handleBreak = () => {
    setIsFishing(false);
    setStatus('Line snapped. Adjust your tension next time.');
  };

  const handleEscape = () => {
    setIsFishing(false);
    setStatus('The fish got away. Try again.');
  };

  const handleGenerateVideo = async () => {
    if (!currentFish || isGenerating) return;
    setIsGenerating(true);
    setStatus('Generating a cinematic catch clip...');
    try {
      const operation = await generateFishVideo(currentFish.name, waterResult?.waterType || 'lake', currentFish.color);
      const done = await pollVideoOperation(operation);
      const link = done?.response?.generatedVideos?.[0]?.video?.uri || done?.response?.generatedVideos?.[0]?.uri || done?.response?.videos?.[0]?.uri;
      if (!link) {
        throw new Error('Video link not found');
      }
      const url = await getDownloadUrl(link);
      setVideoUrl(url);
      setCurrentFish(prev => prev ? { ...prev, video: url } : prev);
      setStatus('Video ready.');
    } catch (err) {
      console.error(err);
      setStatus('Video generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const recentCatches = fishdex.slice(0, 3);

  return (
    <div className="app-shell">
      <div className="app-backdrop" />
      <MapView
        spots={defaultSpots}
        onProximityChange={({ isNearBaitShop, isNearTournament }) => {
          setIsNearBaitShop(isNearBaitShop);
          setIsNearTournament(isNearTournament);
        }}
      />
      <div className="app-vignette" />

      <div className="app-grid">
        <div className="flex flex-col gap-4">
          <div className="glass-panel rounded-3xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-cyan-200 title-font">Fishermon Pro</p>
                <h1 className="text-2xl font-bold text-white">Adaptive Catch Deck</h1>
              </div>
              <div className="flex items-center gap-2">
                <button className="hud-button" onClick={() => setShowMissionBoard(true)}>
                  <Sparkles size={16} />
                  Missions
                </button>
                <button className="hud-button" onClick={() => setShowLeaderboard(true)}>
                  <Trophy size={16} />
                  Rankings
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="hud-pill">
                <Coins size={14} className="text-amber-300" />
                {playerState.money} coins
              </div>
              <div className="hud-pill">
                <Fish size={14} className="text-cyan-300" />
                Lv {playerState.level} • XP {playerState.xp}
              </div>
              <div className="hud-pill">
                <Gift size={14} className="text-emerald-300" />
                Streak {playerState.streak}
              </div>
              <div className="hud-pill">
                <Waves size={14} className="text-blue-300" />
                {waterResult?.hasWater ? waterResult.waterType : 'No water'}
              </div>
            </div>

            <div className="relative h-[260px] rounded-2xl overflow-hidden border border-white/10">
              <Camera ref={cameraRef} />
              {waterResult?.hasWater && (
                <div className="absolute top-3 left-3 bg-cyan-500/80 text-black text-xs font-bold px-3 py-1 rounded-full">
                  Water detected
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="hud-button cta-primary"
                onClick={handleScanWater}
                disabled={isScanning}
              >
                <CameraIcon size={16} />
                {isScanning ? 'Scanning...' : 'Scan Water'}
              </button>
              <button
                className="hud-button"
                onClick={handleCastLine}
                disabled={isFishing || !waterResult?.hasWater}
              >
                <Fish size={16} />
                Cast Line
              </button>
              <button
                className="hud-button cta-secondary"
                onClick={handleUseChum}
                disabled={playerState.inventory.chum <= 0}
              >
                <Zap size={16} />
                Use Chum ({playerState.inventory.chum})
              </button>
            </div>

            <div className="mt-4 text-sm text-white/70">{status}</div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Latest Catch</h3>
              <button className="hud-button" onClick={() => setShowShop(true)}>
                <ShoppingBag size={16} />
                Shop
              </button>
            </div>

            {currentFish ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {currentFish.image ? (
                      <img src={currentFish.image} alt={currentFish.name} className="w-full h-full object-cover" />
                    ) : (
                      <FishVisual rarity={currentFish.rarity} color={currentFish.color} size={48} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg">{currentFish.name}</h4>
                    <p className="text-xs text-white/60">{currentFish.description}</p>
                    <div className="text-xs text-cyan-200 mt-2">{currentFish.weightKg}kg • {currentFish.lengthCm}cm</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-300 font-bold">+{currentFish.price}</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40">{currentFish.rarity}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button className="hud-button" onClick={handleGenerateVideo} disabled={isGenerating}>
                    <Sparkles size={16} />
                    {isGenerating ? 'Rendering...' : 'Generate Clip'}
                  </button>
                  {videoUrl && (
                    <a className="hud-button" href={videoUrl} target="_blank" rel="noreferrer">
                      <MapPin size={16} />
                      View Clip
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-white/50 text-sm">No catches yet. Scan water and cast to start.</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass-panel rounded-3xl p-5">
            <h3 className="text-white font-bold text-lg mb-3">Daily Intel</h3>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-white/70">Daily reward</div>
              <button
                className={`px-3 py-1 rounded-full text-xs font-bold ${canClaimDaily ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white/40'}`}
                onClick={handleClaimDaily}
                disabled={!canClaimDaily}
              >
                {canClaimDaily ? 'Claim' : 'Claimed'}
              </button>
            </div>
            <div className="text-sm text-white/60 mb-4">{dailyRewardAmount} coins</div>

            <div className="text-sm text-white/70">Quest progress</div>
            <div className="flex justify-between text-xs text-white/50 mb-2">
              <span>{playerState.dailyQuest.progress}/{playerState.dailyQuest.target} fish</span>
              <span>{playerState.dailyQuest.complete ? 'Complete' : 'Active'}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${Math.min(100, (playerState.dailyQuest.progress / playerState.dailyQuest.target) * 100)}%` }}
              />
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <h3 className="text-white font-bold text-lg mb-3">Milestones</h3>
            <div className="text-xs text-white/60">Lifetime catches: {playerState.lifetimeCatches}</div>
            <div className="text-xs text-white/60">Total weight: {playerState.lifetimeWeightKg.toFixed(1)} kg</div>
            <div className="flex justify-between text-xs text-white/60 mt-3 mb-2">
              <span>Next target: {milestoneTarget}</span>
              <span>{milestoneProgress}/{milestoneTarget}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-cyan-400"
                style={{ width: `${Math.min(100, (milestoneProgress / milestoneTarget) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-white/50 mt-2">Reward: {milestoneReward} coins</div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Recent Catches</h3>
              <button className="hud-button" onClick={() => setShowMapSpots(true)}>
                <MapPin size={16} />
                Nearby
              </button>
            </div>
            {recentCatches.length === 0 ? (
              <div className="text-white/40 text-sm">No fish logged yet.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentCatches.map(fish => (
                  <div key={fish.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3">
                    <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center">
                      <Fish size={16} className="text-cyan-200" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-semibold">{fish.name}</div>
                      <div className="text-xs text-white/50">{fish.weightKg}kg • {fish.rarity}</div>
                    </div>
                    <div className="text-xs text-amber-300 font-bold">+{fish.price}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showShop && (
          <Shop
            playerState={playerState}
            setPlayerState={setPlayerState}
            onClose={() => setShowShop(false)}
            isNearBaitShop={isNearBaitShop}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaderboard && (
          <Leaderboard
            fishdex={fishdex}
            onClose={() => setShowLeaderboard(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMapSpots && (
          <MapSpots
            onClose={() => setShowMapSpots(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMissionBoard && (
          <MissionBoard
            playerState={playerState}
            onClose={() => setShowMissionBoard(false)}
            canClaimDaily={canClaimDaily}
            onClaimDaily={handleClaimDaily}
            dailyRewardAmount={dailyRewardAmount}
            milestoneTarget={milestoneTarget}
            milestoneProgress={milestoneProgress}
            milestoneReward={milestoneReward}
            isNearTournament={isNearTournament}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFishing && (
          <TensionReeling
            rodMultiplier={rodMultiplier}
            onCatch={handleCatch}
            onBreak={handleBreak}
            onEscape={handleEscape}
          />
        )}
      </AnimatePresence>

      {isGenerating && !isFishing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel rounded-3xl px-6 py-4 text-white flex items-center gap-3">
            <Sparkles className="animate-pulse text-cyan-300" size={20} />
            Processing...
          </div>
        </div>
      )}
    </div>
  );
}
