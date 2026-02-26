import { useState, useRef, useEffect } from 'react';
import { Camera, CameraRef } from './components/Camera';
import { TensionReeling } from './components/TensionReeling';
import { Shop } from './components/Shop';
import { Leaderboard } from './components/Leaderboard';
import { MapSpots } from './components/MapSpots';
import { MapView } from './components/MapView';
import { Passport } from './components/Passport';
import { detectWater, generateFishStats, generateFishImage, generateFishVideo, pollVideoOperation, getDownloadUrl, generatePresetVideos } from './lib/gemini';
import { MapPin, Fish, Loader2, Crosshair, PackageOpen, X, Camera as CameraIcon, Store, Trophy, Coins, Map as MapIcon, ChevronLeft, Video, Play, Sparkles, Globe2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FishData, PlayerState, PassportDestination } from './types';
import { SHOP_ITEMS } from './constants';
import { FishVisual } from './components/FishVisual';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type GameState = 'MAP' | 'CAMERA' | 'SCANNING' | 'READY' | 'WAITING' | 'BITING' | 'REELING' | 'CAUGHT' | 'BROKEN' | 'ESCAPED';

const DEFAULT_PLAYER_STATE: PlayerState = {
  money: 0,
  level: 1,
  xp: 0,
  streak: 0,
  lastWaterType: undefined,
  dailyRewardLastClaim: undefined,
  dailyQuest: {
    date: '',
    target: 3,
    progress: 0,
    reward: 250,
    complete: false
  },
  inventory: {
    rods: ['rod_basic'],
    lures: ['lure_none'],
    baits: ['bait_bread'],
    boats: ['boat_none'],
    chum: 0
  },
  equipped: {
    rod: 'rod_basic',
    lure: 'lure_none',
    bait: 'bait_bread',
    boat: 'boat_none'
  },
  rodCustomization: {
    'rod_basic': { color: '#ffffff', decal: 'none' }
  }
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const buildDailyQuest = () => {
  const target = Math.floor(Math.random() * 3) + 3; // 3-5 fish
  const reward = target * 150;
  return {
    date: getTodayKey(),
    target,
    progress: 0,
    reward,
    complete: false
  };
};

const ensureDailyQuest = (state: PlayerState): PlayerState => {
  if (!state.dailyQuest || state.dailyQuest.date !== getTodayKey()) {
    return {
      ...state,
      dailyQuest: buildDailyQuest()
    };
  }
  return state;
};

const normalizePlayerState = (saved: Partial<PlayerState>): PlayerState => {
  const merged = {
    ...DEFAULT_PLAYER_STATE,
    ...saved,
    inventory: {
      ...DEFAULT_PLAYER_STATE.inventory,
      ...(saved.inventory || {})
    },
    equipped: {
      ...DEFAULT_PLAYER_STATE.equipped,
      ...(saved.equipped || {})
    },
    rodCustomization: {
      ...DEFAULT_PLAYER_STATE.rodCustomization,
      ...(saved.rodCustomization || {})
    }
  } as PlayerState;
  return ensureDailyQuest(merged);
};

const getNextLevelXp = (level: number) => Math.round(120 + level * 80);

const getXpForFish = (fish: FishData) => {
  const base = Math.max(10, Math.round(fish.price / 10));
  const rarityBonus = fish.rarity === 'Legendary' - 80 : fish.rarity === 'Epic' - 40 : fish.rarity === 'Rare' - 20 : 0;
  return base + rarityBonus;
};

const SAFETY_WARNING_KEY = 'fishermon-safety-warning-v1';
const PASSPORT_STORAGE_KEY = 'fishermon-passport-destination-v1';
export default function App() {
  const [state, setState] = useState<GameState>('MAP');
  const [waterType, setWaterType] = useState<string | null>(null);
  const [currentFish, setCurrentFish] = useState<FishData | null>(null);
  const [fishdex, setFishdex] = useState<FishData[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);
  const [customSpots, setCustomSpots] = useState<Array<{ lat: number; lng: number; name: string; type: string }>>([]);
  
  const [showFishdex, setShowFishdex] = useState(false);
  const [fishdexSort, setFishdexSort] = useState<'recent' | 'value' | 'rarity' | 'weight' | 'length'>('recent');
  const [fishdexFilter, setFishdexFilter] = useState<string>('All');
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMapSpots, setShowMapSpots] = useState(false);
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);
  const [showPassport, setShowPassport] = useState(false);
  const [passportDestination, setPassportDestination] = useState<PassportDestination | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);
  const [presetVideo, setPresetVideo] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [proximity, setProximity] = useState({ isNearBaitShop: false, isNearTournament: false });
  
  const cameraRef = useRef<CameraRef>(null);
  
  useEffect(() => {
    const savedDex = localStorage.getItem('fishdex');
    if (savedDex) {
      try {
        setFishdex(JSON.parse(savedDex));
      } catch (e) {}
    }
    const savedPlayer = localStorage.getItem('playerState');
    if (savedPlayer) {
      try {
        setPlayerState(normalizePlayerState(JSON.parse(savedPlayer)));
      } catch (e) {}
    }
    const savedSpots = localStorage.getItem('customSpots');
    if (savedSpots) {
      try {
        setCustomSpots(JSON.parse(savedSpots));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const acknowledged = localStorage.getItem(SAFETY_WARNING_KEY) === '1';
    setShowSafetyWarning(!acknowledged);
  }, []);

  useEffect(() => {
    const savedPassport = localStorage.getItem(PASSPORT_STORAGE_KEY);
    if (savedPassport) {
      try {
        setPassportDestination(JSON.parse(savedPassport));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (passportDestination) {
      localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(passportDestination));
    } else {
      localStorage.removeItem(PASSPORT_STORAGE_KEY);
    }
  }, [passportDestination]);

  useEffect(() => {
    localStorage.setItem('playerState', JSON.stringify(playerState));
  }, [playerState]);

  useEffect(() => {
    setPlayerState(prev => ensureDailyQuest(prev));
  }, []);

  useEffect(() => {
    localStorage.setItem('customSpots', JSON.stringify(customSpots));
  }, [customSpots]);
  
  const saveToFishdex = (fish: FishData) => {
    const newDex = [fish, ...fishdex];
    setFishdex(newDex);
    localStorage.setItem('fishdex', JSON.stringify(newDex));
  };

  const handleScan = async () => {
    if (!cameraRef.current) return;
    setState('SCANNING');
    const base64 = cameraRef.current.captureFrame();
    if (!base64) {
      setState('CAMERA');
      return;
    }
    
    setState('SCANNING');
    try {
      const result = await detectWater(base64);
      if (result.hasWater) {
        setWaterType(result.waterType);
        setPlayerState(prev => ({ ...prev, lastWaterType: result.waterType }));
        
        // Add to custom spots if we have location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const newSpot = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              name: `Discovered ${result.waterType}`,
              type: result.waterType
            };
            setCustomSpots(prev => [...prev, newSpot]);
          });
        }
        
        setState('READY');

        // Start generating preset videos if not already done
        if (!presetVideo) {
          handleGeneratePresets(result.waterType);
        }
      } else {
        alert("No water detected! Point your camera at a lake, river, puddle, or even a glass of water.");
        setState('CAMERA');
      }
    } catch (err) {
      console.error(err);
      alert("Error analyzing image.");
      setState('CAMERA');
    }
  };

  const handleGeneratePresets = async (type: string) => {
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) return; 

      setIsGeneratingPresets(true);
      const operation = await generatePresetVideos(type);
      const finishedOp = await pollVideoOperation(operation);
      const downloadLink = finishedOp.response-.generatedVideos-.[0]-.video-.uri;
      
      if (downloadLink) {
        const videoUrl = await getDownloadUrl(downloadLink);
        setPresetVideo(videoUrl);
      }
    } catch (err) {
      console.error("Preset generation failed:", err);
    } finally {
      setIsGeneratingPresets(false);
    }
  };

  const canClaimDaily = playerState.dailyRewardLastClaim !== getTodayKey();

  const handleClaimDaily = () => {
    if (!canClaimDaily) return;
    const reward = 300 + playerState.level * 20;
    setPlayerState(prev => ({
      ...prev,
      money: prev.money + reward,
      dailyRewardLastClaim: getTodayKey()
    }));
  };

  const handleInstantCast = () => {
    if (!playerState.lastWaterType) return;
    setWaterType(playerState.lastWaterType);
    setState('READY');
    if (!presetVideo) {
      handleGeneratePresets(playerState.lastWaterType);
    }
  };

  const handleCast = () => {
    setState('WAITING');
    // Magic bait reduces wait time slightly, but base time is longer now
    const baitItem = SHOP_ITEMS.baits.find(b => b.id === playerState.equipped.bait);
    const isMagic = baitItem-.id === 'bait_magic';
    
    // Base wait time is 8-15 seconds to make it feel slower/more realistic
    let waitTime = Math.random() * 7000 + 8000;
    
    if (isMagic) {
      waitTime *= 0.6; // 40% faster
    }
    
    setTimeout(() => {
      setState(currentState => {
        if (currentState === 'WAITING') {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          
          setTimeout(() => {
            setState(s => s === 'BITING' - 'ESCAPED' : s);
          }, 3000);
          
          return 'BITING';
        }
        return currentState;
      });
    }, waitTime);
  };

  const handleUseChum = () => {
    if (playerState.inventory.chum > 0 && state === 'WAITING') {
      setPlayerState(prev => ({
        ...prev,
        inventory: {
          ...prev.inventory,
          chum: prev.inventory.chum - 1
        }
      }));
      
      // Instantly trigger a bite
      setState('BITING');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      
      setTimeout(() => {
        setState(s => s === 'BITING' - 'ESCAPED' : s);
      }, 3000);
    }
  };

  const handleHook = () => {
    if (state === 'BITING') {
      setState('REELING');
    }
  };

  const handleCatch = async () => {
    setState('CAUGHT');
    setIsGeneratingImage(true);
    try {
      const lureItem = SHOP_ITEMS.lures.find(l => l.id === playerState.equipped.lure);
      const baitItem = SHOP_ITEMS.baits.find(b => b.id === playerState.equipped.bait);
      const boatItem = SHOP_ITEMS.boats.find(b => b.id === playerState.equipped.boat);
      
      const stats = await generateFishStats(
        waterType || 'mysterious water',
        lureItem-.name || 'No Lure',
        baitItem-.name || 'Bread',
        boatItem-.name || 'Shore'
      );
      
      const fishWithId = { ...stats, id: Date.now().toString(), caughtAt: Date.now() };
      
      // Tournament bonus: 2x price and XP if in tournament zone
      if (proximity.isNearTournament) {
        fishWithId.price *= 2;
      }
      
      setCurrentFish(fishWithId);

      setPlayerState(prev => {
        const baseState = ensureDailyQuest(prev);
        const streak = baseState.streak + 1;
        let xp = baseState.xp + getXpForFish(fishWithId) + streak * 2;
        let level = baseState.level;
        let next = getNextLevelXp(level);
        while (xp >= next) {
          xp -= next;
          level += 1;
          next = getNextLevelXp(level);
        }

        const quest = baseState.dailyQuest;
        let questProgress = quest.progress;
        let questComplete = quest.complete;
        let questReward = 0;
        if (!questComplete) {
          questProgress = Math.min(quest.target, quest.progress + 1);
          if (questProgress >= quest.target) {
            questComplete = true;
            questReward = quest.reward;
          }
        }

        return {
          ...baseState,
          level,
          xp,
          streak,
          lastWaterType: waterType || baseState.lastWaterType,
          money: baseState.money + questReward,
          dailyQuest: {
            ...quest,
            progress: questProgress,
            complete: questComplete
          }
        };
      });
      
      generateFishImage(stats.name, waterType || 'mysterious water', stats.color).then(img => {
        if (img) {
          const completeFish = { ...fishWithId, image: img };
          setCurrentFish(completeFish);
          saveToFishdex(completeFish);
        } else {
          saveToFishdex(fishWithId);
        }
        setIsGeneratingImage(false);
      });
    } catch (err) {
      console.error(err);
      setState('MAP');
    }
  };

  const handleSellFish = (fish: FishData, fromDex: boolean = false) => {
    setPlayerState(prev => ({ ...prev, money: prev.money + fish.price }));
    if (fromDex) {
      const newDex = fishdex.filter(f => f.id !== fish.id);
      setFishdex(newDex);
      localStorage.setItem('fishdex', JSON.stringify(newDex));
    } else {
      setState('MAP');
      setCurrentFish(null);
    }
  };

  const getRodMultiplier = () => {
    const rod = SHOP_ITEMS.rods.find(r => r.id === playerState.equipped.rod);
    return rod-.multiplier || 1;
  };

  const isMagicBait = playerState.equipped.bait === 'bait_magic';
  const currentRodCustomization = playerState.rodCustomization[playerState.equipped.rod];
  const nextLevelXp = getNextLevelXp(playerState.level);
  const xpProgress = Math.min(1, playerState.xp / nextLevelXp);
  const rarityRank: Record<string, number> = {
    Common: 1,
    Uncommon: 2,
    Rare: 3,
    Epic: 4,
    Legendary: 5,
    Mythic: 6
  };
  const fishdexRarities = Array.from(new Set(fishdex.map(f => f.rarity))).sort((a, b) => {
    const aRank = rarityRank[a] || 0;
    const bRank = rarityRank[b] || 0;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
  const fishdexFiltered = fishdexFilter === 'All'
    - fishdex
    : fishdex.filter(f => f.rarity === fishdexFilter);
  const fishdexView = [...fishdexFiltered].sort((a, b) => {
    switch (fishdexSort) {
      case 'value':
        return b.price - a.price;
      case 'rarity':
        return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
      case 'weight':
        return b.weightKg - a.weightKg;
      case 'length':
        return b.lengthCm - a.lengthCm;
      case 'recent':
      default:
        return b.caughtAt - a.caughtAt;
    }
  });
  const fishdexTotalValue = fishdexFiltered.reduce((sum, fish) => sum + fish.price, 0);
  const sortOptions = [
    { id: 'recent', label: 'Recent' },
    { id: 'value', label: 'Value' },
    { id: 'rarity', label: 'Rarity' },
    { id: 'weight', label: 'Weight' },
    { id: 'length', label: 'Length' }
  ];

  const handleSellFiltered = () => {
    if (fishdexFiltered.length === 0) return;
    const sellIds = new Set(fishdexFiltered.map(f => f.id));
    const remaining = fishdex.filter(f => !sellIds.has(f.id));
    setFishdex(remaining);
    localStorage.setItem('fishdex', JSON.stringify(remaining));
    setPlayerState(prev => ({ ...prev, money: prev.money + fishdexTotalValue }));
  };

  const handleGenerateVideo = async () => {
    if (!currentFish) return;
    
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Proceeding after key selection
      }

      setIsGeneratingVideo(true);
      setVideoStatus('Initiating video generation...');
      
      const operation = await generateFishVideo(currentFish.name, waterType || 'water', currentFish.color);
      setVideoStatus('Generating video (this may take a few minutes)...');
      
      const finishedOp = await pollVideoOperation(operation);
      const downloadLink = finishedOp.response-.generatedVideos-.[0]-.video-.uri;
      
      if (downloadLink) {
        setVideoStatus('Downloading video...');
        const videoUrl = await getDownloadUrl(downloadLink);
        const completeFish = { ...currentFish, video: videoUrl };
        setCurrentFish(completeFish);
        
        // Update in fishdex if already saved
        const newDex = fishdex.map(f => f.id === currentFish.id - completeFish : f);
        setFishdex(newDex);
        localStorage.setItem('fishdex', JSON.stringify(newDex));
      }
    } catch (err) {
      console.error("Video generation failed:", err);
      alert("Video generation failed. Please ensure you have a valid API key and try again.");
    } finally {
      setIsGeneratingVideo(false);
      setVideoStatus('');
    }
  };

  const acknowledgeSafetyWarning = () => {
    localStorage.setItem(SAFETY_WARNING_KEY, '1');
    setShowSafetyWarning(false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden app-shell">
      <div className="app-backdrop" />
      <div className="app-grid" />
      <div className="app-vignette" />
      
      {state === 'MAP' && (
        <MapView
          spots={customSpots}
          onProximityChange={setProximity}
          overridePosition={
            passportDestination - [passportDestination.lat, passportDestination.lng] : null
          }
          overrideLabel={passportDestination-.label -- null}
        />
      )}
      
      {state !== 'MAP' && <Camera ref={cameraRef} />}

      {showSafetyWarning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-[90%] max-w-xl p-6 text-white">
            <h2 className="title-font text-2xl mb-2">Safety Warning</h2>
            <p className="text-white/70 text-sm mb-4">
              Play responsibly and stay aware of your surroundings.
            </p>
            <ul className="list-disc list-inside text-white/70 text-sm space-y-2">
              <li>Never play while driving or in unsafe areas.</li>
              <li>Stay clear of dangerous waters, cliffs, or restricted zones.</li>
              <li>Respect private property and local regulations.</li>
              <li>Supervise children at all times near water.</li>
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                onClick={acknowledgeSafetyWarning}
                className="cta-primary px-4 py-2 rounded-xl text-sm font-semibold"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2">
          {state !== 'MAP' && (
            <button 
              onClick={() => setState('MAP')}
              className="hud-pill px-4 py-2 flex items-center gap-2 text-white pointer-events-auto hover:bg-black/80 transition-colors"
            >
              <ChevronLeft size={16} />
              <span className="text-sm font-medium">Back to Map</span>
            </button>
          )}
          
          {waterType && state !== 'MAP' && (
            <div className="hud-pill px-4 py-2 flex items-center gap-2 text-white pointer-events-auto">
              <MapPin size={16} className="text-cyan-300 hud-icon" />
              <span className="text-sm font-medium capitalize">
                {waterType} detected
              </span>
            </div>
          )}

          {passportDestination && (
            <button
              onClick={() => setShowPassport(true)}
              className="hud-pill px-4 py-2 flex items-center gap-2 text-emerald-200 pointer-events-auto hover:bg-black/60 transition-colors"
            >
              <Globe2 size={16} className="text-emerald-300 hud-icon" />
              <span className="text-sm font-medium">Passport: {passportDestination.label}</span>
            </button>
          )}
          
          <div className="hud-pill px-4 py-2 flex items-center gap-2 text-yellow-300 pointer-events-auto font-bold">
            <Coins size={16} className="hud-icon" />
            {playerState.money}
          </div>
          
          <div className="hud-pill px-4 py-2 pointer-events-auto">
            <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-widest text-white/70">
              <span>Level {playerState.level}</span>
              <span>{playerState.xp}/{nextLevelXp} XP</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-400" style={{ width: `${xpProgress * 100}%` }} />
            </div>
          </div>

          <div className="hud-pill px-4 py-2 flex items-center gap-2 text-emerald-200 pointer-events-auto font-bold">
            <Fish size={14} className="text-emerald-300" />
            Streak {playerState.streak}
          </div>

          <div className="glass-panel px-4 py-2 pointer-events-auto text-white/80 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="uppercase tracking-widest text-[10px] text-cyan-200">Daily Quest</span>
              <span className="text-emerald-200 font-bold">{playerState.dailyQuest.progress}/{playerState.dailyQuest.target}</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${Math.min(1, playerState.dailyQuest.progress / playerState.dailyQuest.target) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-white/50">
              Reward: {playerState.dailyQuest.reward} coins {playerState.dailyQuest.complete - '(claimed)' : ''}
            </div>
          </div>

          <button
            onClick={handleClaimDaily}
            className={`hud-pill px-4 py-2 text-xs font-bold uppercase tracking-widest pointer-events-auto ${canClaimDaily - 'text-amber-200 border-amber-300/30' : 'text-white/40 border-white/10'} `}
          >
            {canClaimDaily - 'Claim Daily Reward' : 'Daily Reward Claimed'}
          </button>
        </div>
        
        <div className="flex flex-col gap-2 pointer-events-auto">
          {proximity.isNearBaitShop && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-orange-600/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-orange-200 border border-orange-400/30"
            >
              <Store size={14} className="text-orange-300" />
              <span className="text-[10px] font-black uppercase tracking-widest">Bait Shop Nearby</span>
            </motion.div>
          )}

          {proximity.isNearTournament && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-blue-600/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-blue-200 border border-blue-400/30 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              <Trophy size={14} className="text-blue-300" />
              <span className="text-[10px] font-black uppercase tracking-widest">Tournament Zone (2x XP)</span>
            </motion.div>
          )}

          {isMagicBait && (
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-purple-600/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-purple-200 border border-purple-400/30 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              <Sparkles size={14} className="text-purple-300" />
              <span className="text-[10px] font-black uppercase tracking-widest">Magic Active</span>
            </motion.div>
          )}
          
          <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-white/80 border border-white/10">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentRodCustomization-.color || '#fff' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {SHOP_ITEMS.rods.find(r => r.id === playerState.equipped.rod)-.name}
            </span>
          </div>

          <button 
            onClick={() => setShowMapSpots(true)}
            className="hud-button p-3 text-white transition-colors"
          >
            <MapIcon size={20} />
          </button>
          <button
            onClick={() => setShowPassport(true)}
            className="hud-button p-3 text-white transition-colors"
            title="Passport Travel"
          >
            <Globe2 size={20} />
          </button>
          <button 
            onClick={() => setShowFishdex(true)}
            className="hud-button p-3 text-white transition-colors"
          >
            <PackageOpen size={20} />
          </button>
          <button 
            onClick={() => setShowShop(true)}
            className="hud-button p-3 text-white transition-colors"
          >
            <Store size={20} />
          </button>
          <button 
            onClick={() => setShowLeaderboard(true)}
            className="hud-button p-3 text-white transition-colors"
          >
            <Trophy size={20} />
          </button>
        </div>
      </div>

      {/* Main UI Overlay */}
      <AnimatePresence mode="wait">
        {state === 'MAP' && (
          <motion.div 
            key="map"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 left-0 right-0 flex justify-center z-10"
          >
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <button 
                onClick={() => setState('CAMERA')}
                className="cta-primary text-white rounded-full px-8 py-4 font-bold text-lg flex items-center gap-3 tracking-wide"
              >
                <CameraIcon size={24} />
                Open Camera to Fish
              </button>
              {playerState.lastWaterType && (
                <button 
                  onClick={handleInstantCast}
                  className="cta-secondary text-emerald-200 rounded-full px-6 py-4 font-bold text-sm flex items-center gap-2 tracking-widest uppercase"
                >
                  <Play size={16} />
                  Instant Cast ({playerState.lastWaterType})
                </button>
              )}
            </div>
          </motion.div>
        )}

        {state === 'CAMERA' && (
          <motion.div 
            key="camera"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 left-0 right-0 flex justify-center z-10"
          >
            <button 
              onClick={handleScan}
              className="cta-primary text-white rounded-full px-8 py-4 font-bold text-lg flex items-center gap-3 tracking-wide"
            >
              <Crosshair size={24} />
              Scan Water
            </button>
          </motion.div>
        )}

        {state !== 'MAP' && (
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Fish Finder Overlay */}
            {(state === 'READY' || state === 'WAITING' || state === 'BITING') && presetVideo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <video 
                  src={presetVideo} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover mix-blend-screen opacity-40"
                  style={{ filter: 'blur(2px) brightness(1.2) contrast(1.2) hue-rotate(180deg)' }}
                />
              </motion.div>
            )}
            
            {isGeneratingPresets && (
              <div className="absolute top-24 right-4 bg-black/40 backdrop-blur-md rounded-lg p-2 border border-white/10 flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-blue-400" />
                <span className="text-[10px] text-white/70">Scanning for fish activity...</span>
              </div>
            )}
          </div>
        )}

        {state === 'SCANNING' && (
          <motion.div 
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <Loader2 size={48} className="text-blue-400 animate-spin mb-4" />
            <p className="text-white text-lg font-medium">Analyzing environment...</p>
          </motion.div>
        )}

        {state === 'READY' && (
          <motion.div 
            key="ready"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-12 left-0 right-0 flex justify-center z-10"
          >
            <button 
              onClick={handleCast}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-10 py-5 font-bold text-xl shadow-[0_0_30px_rgba(5,150,105,0.5)] flex items-center gap-3"
            >
              <Crosshair size={28} />
              CAST LINE
            </button>
          </motion.div>
        )}

        {state === 'WAITING' && (
          <motion.div 
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="w-12 h-12 rounded-full bg-red-500 border-4 border-white shadow-lg relative"
            >
              <div className="absolute top-full left-1/2 w-0.5 h-32 bg-white/50 -translate-x-1/2" />
            </motion.div>
            <p className="text-white mt-8 font-medium text-lg drop-shadow-md mb-8">Waiting for a bite...</p>
            
            {playerState.inventory.chum > 0 && (
              <button
                onClick={handleUseChum}
                className="bg-red-600/80 hover:bg-red-500 backdrop-blur-md text-white rounded-full px-6 py-3 font-bold shadow-lg flex items-center gap-2 pointer-events-auto border border-red-400/30"
              >
                <PackageOpen size={20} />
                Throw Chum ({playerState.inventory.chum})
              </button>
            )}
          </motion.div>
        )}

        {state === 'BITING' && (
          <motion.div 
            key="biting"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-500/20"
          >
            <motion.div 
              animate={{ y: [0, 20, -5, 10, 0], x: [-5, 5, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="w-12 h-12 rounded-full bg-red-500 border-4 border-white shadow-lg relative mb-12"
            />
            <button 
              onClick={handleHook}
              className="bg-red-600 text-white rounded-full px-12 py-6 font-black text-3xl shadow-[0_0_50px_rgba(220,38,38,0.8)] animate-pulse"
            >
              HOOK IT!
            </button>
          </motion.div>
        )}

        {state === 'REELING' && (
          <TensionReeling 
            rodMultiplier={getRodMultiplier()}
            onCatch={handleCatch}
            onBreak={() => {
              setPlayerState(prev => ({ ...prev, streak: 0 }));
              setState('BROKEN');
            }}
            onEscape={() => {
              setPlayerState(prev => ({ ...prev, streak: 0 }));
              setState('ESCAPED');
            }}
          />
        )}

        {state === 'CAUGHT' && currentFish && (
          <motion.div 
            key="caught"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-32 opacity-20" style={{ backgroundColor: currentFish.color }} />
              
              <h2 className="text-3xl font-black text-white text-center mb-2 relative z-10">CAUGHT!</h2>
              
              <div className="w-48 h-48 mx-auto bg-black/50 rounded-2xl border border-white/10 flex items-center justify-center relative z-10 mb-6 overflow-hidden">
                {currentFish.video - (
                  <video 
                    src={currentFish.video} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover mix-blend-screen"
                    style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                  />
                ) : currentFish.image - (
                  <img src={currentFish.image} alt={currentFish.name} className="w-full h-full object-cover" />
                ) : isGeneratingImage - (
                  <div className="flex flex-col items-center text-white/50">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <span className="text-xs">Developing photo...</span>
                  </div>
                ) : (
                  <FishVisual rarity={currentFish.rarity} color={currentFish.color} size={80} />
                )}
                
                {isGeneratingVideo && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 text-center">
                    <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                    <span className="text-[10px] text-white/80">{videoStatus}</span>
                  </div>
                )}
              </div>
              
              <div className="text-center relative z-10">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2" style={{ backgroundColor: `${currentFish.color}40`, color: currentFish.color }}>
                  {currentFish.rarity}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{currentFish.name}</h3>
                <p className="text-white/70 text-sm mb-4">{currentFish.description}</p>
                
                <div className="flex justify-center gap-4 text-white/60 text-sm mb-4">
                  <div className="bg-black/30 px-3 py-2 rounded-lg">
                    <span className="block text-xs uppercase opacity-70">Weight</span>
                    <span className="font-mono text-white">{currentFish.weightKg} kg</span>
                  </div>
                  <div className="bg-black/30 px-3 py-2 rounded-lg">
                    <span className="block text-xs uppercase opacity-70">Length</span>
                    <span className="font-mono text-white">{currentFish.lengthCm} cm</span>
                  </div>
                </div>

                {!currentFish.video && !isGeneratingVideo && (
                  <button 
                    onClick={handleGenerateVideo}
                    className="w-full py-2 mb-4 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-600/30 transition-colors"
                  >
                    <Video size={14} /> Generate AR Video
                  </button>
                )}
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSellFish(currentFish)}
                    className="flex-1 py-3 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Coins size={18} /> Sell ({currentFish.price})
                  </button>
                  <button 
                    onClick={() => {
                      setState('MAP');
                      setCurrentFish(null);
                    }}
                    className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Keep
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {(state === 'BROKEN' || state === 'ESCAPED') && (
          <motion.div 
            key="failed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          >
            <h2 className="text-4xl font-black text-red-500 mb-4">
              {state === 'BROKEN' - 'LINE BROKE!' : 'IT GOT AWAY!'}
            </h2>
            <p className="text-white/80 text-lg mb-8 text-center">
              {state === 'BROKEN' - 'You reeled in too hard. Watch the tension!' : 'You were too slow. Keep the tension up!'}
            </p>
            <button 
              onClick={() => setState('MAP')}
              className="bg-white text-black rounded-full px-8 py-4 font-bold text-lg hover:bg-gray-200"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fishdex Modal */}
      <AnimatePresence>
        {showFishdex && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 bg-[#050a14] flex flex-col"
          >
            <div className="p-4 flex justify-between items-center border-b border-white/10 glass-panel">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 title-font">
                <PackageOpen size={24} className="text-cyan-300" />
                Fishdex
              </h2>
              <button 
                onClick={() => setShowFishdex(false)}
                className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="px-4 py-3 flex flex-col gap-3 border-b border-white/5 glass-panel">
              <div className="flex flex-wrap gap-2">
                {['All', ...fishdexRarities].map(rarity => (
                  <button
                    key={rarity}
                    onClick={() => setFishdexFilter(rarity)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${fishdexFilter === rarity - 'bg-cyan-400 text-black' : 'bg-white/5 text-white/60 hover:text-white'}`}
                  >
                    {rarity}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-white/50">Sort</span>
                {sortOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setFishdexSort(option.id as typeof fishdexSort)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${fishdexSort === option.id - 'bg-emerald-400 text-black' : 'bg-white/5 text-white/60 hover:text-white'}`}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  onClick={handleSellFiltered}
                  disabled={fishdexFiltered.length === 0}
                  className={`ml-auto px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${fishdexFiltered.length === 0 - 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-yellow-400 text-black hover:bg-yellow-300'}`}
                >
                  Sell Filtered
                </button>
              </div>
              <div className="text-[11px] text-white/60">
                Showing {fishdexView.length} fish - Total value {fishdexTotalValue}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {fishdex.length === 0 - (
                <div className="h-full flex flex-col items-center justify-center text-white/40">
                  <Fish size={48} className="mb-4 opacity-20" />
                  <p>Your Fishdex is empty.</p>
                  <p className="text-sm">Go catch some fish!</p>
                </div>
              ) : fishdexView.length === 0 - (
                <div className="h-full flex flex-col items-center justify-center text-white/50">
                  <PackageOpen size={48} className="mb-4 opacity-20" />
                  <p>No fish match this filter.</p>
                  <p className="text-sm">Try another rarity or sort.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {fishdexView.map((fish) => (
                    <div key={fish.id} className="glass-panel rounded-2xl p-3 flex flex-col items-center text-center relative group">
                      <div className="w-full aspect-square bg-black/50 rounded-xl mb-3 overflow-hidden flex items-center justify-center relative">
                        {fish.video - (
                          <video 
                            src={fish.video} 
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                            className="w-full h-full object-cover mix-blend-screen"
                            style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                          />
                        ) : fish.image - (
                          <img src={fish.image} alt={fish.name} className="w-full h-full object-cover" />
                        ) : (
                          <FishVisual rarity={fish.rarity} color={fish.color} size={40} />
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: `${fish.color}40`, color: fish.color }}>
                          {fish.rarity}
                        </div>
                        {fish.video && (
                          <div className="absolute bottom-2 left-2 bg-blue-500/80 text-white p-1 rounded-md">
                            <Video size={10} />
                          </div>
                        )}
                      </div>
                      <h4 className="text-white font-bold text-sm mb-1 line-clamp-1">{fish.name}</h4>
                      <div className="flex gap-2 text-[10px] text-white/50 font-mono mb-2">
                        <span>{fish.weightKg}kg</span>
                        <span>{fish.lengthCm}cm</span>
                      </div>
                      <button 
                        onClick={() => handleSellFish(fish, true)}
                        className="w-full py-1.5 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <Coins size={12} /> Sell ({fish.price})
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShop && (
          <Shop 
            playerState={playerState} 
            setPlayerState={setPlayerState} 
            onClose={() => setShowShop(false)} 
            isNearBaitShop={proximity.isNearBaitShop}
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
            overrideDestination={passportDestination}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPassport && (
          <Passport
            current={passportDestination}
            onSelect={(destination) => setPassportDestination(destination)}
            onClear={() => setPassportDestination(null)}
            onClose={() => setShowPassport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
