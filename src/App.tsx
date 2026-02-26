import { useState, useRef, useEffect } from 'react';
import { Camera, CameraRef } from './components/Camera';
import { TensionReeling } from './components/TensionReeling';
import { Shop } from './components/Shop';
import { Leaderboard } from './components/Leaderboard';
import { MapSpots } from './components/MapSpots';
import { MapView } from './components/MapView';
import { detectWater, generateFishStats, generateFishImage, generateFishVideo, pollVideoOperation, getDownloadUrl, generatePresetVideos } from './lib/gemini';
import { MapPin, Fish, Loader2, Crosshair, PackageOpen, X, Camera as CameraIcon, Store, Trophy, Coins, Map as MapIcon, ChevronLeft, Video, Play, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FishData, PlayerState } from './types';
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
  },
  licenseExpiry: Date.now() + 24 * 60 * 60 * 1000 // 1 day from now
};

export default function App() {
  const [state, setState] = useState<GameState>('MAP');
  const [waterType, setWaterType] = useState<string | null>(null);
  const [currentFish, setCurrentFish] = useState<FishData | null>(null);
  const [fishdex, setFishdex] = useState<FishData[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);
  const [customSpots, setCustomSpots] = useState<Array<{ lat: number; lng: number; name: string; type: string }>>([]);
  
  const [showFishdex, setShowFishdex] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMapSpots, setShowMapSpots] = useState(false);
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
        setPlayerState(JSON.parse(savedPlayer));
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
    localStorage.setItem('playerState', JSON.stringify(playerState));
  }, [playerState]);

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
      const downloadLink = finishedOp.response?.generatedVideos?.[0]?.video?.uri;
      
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

  const handleCast = () => {
    if (playerState.licenseExpiry < Date.now()) {
      alert("Your fishing license has expired! You must renew it to fish.");
      setShowShop(true);
      return;
    }
    setState('WAITING');
    // Magic bait reduces wait time slightly, but base time is longer now
    const baitItem = SHOP_ITEMS.baits.find(b => b.id === playerState.equipped.bait);
    const isMagic = baitItem?.id === 'bait_magic';
    
    // Base wait time is 8-15 seconds to make it feel slower/more realistic
    let waitTime = Math.random() * 7000 + 8000;
    
    if (isMagic) {
      waitTime *= 0.6; // 40% faster
    }
    
    setTimeout(() => {
      setState(currentState => {
        if (currentState === 'WAITING') {
          // Massive, realistic vibration burst for strike
          if (navigator.vibrate) {
            navigator.vibrate([100, 30, 100, 30, 300, 50, 500]);
          }
          
          setTimeout(() => {
            setState(s => s === 'BITING' ? 'ESCAPED' : s);
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
      if (navigator.vibrate) {
        navigator.vibrate([100, 30, 100, 30, 300, 50, 500]);
      }
      
      setTimeout(() => {
        setState(s => s === 'BITING' ? 'ESCAPED' : s);
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
        lureItem?.name || 'No Lure',
        baitItem?.name || 'Bread',
        boatItem?.name || 'Shore'
      );
      
      const fishWithId = { ...stats, id: Date.now().toString(), caughtAt: Date.now() };
      
      // Tournament bonus: 2x price and XP if in tournament zone
      if (proximity.isNearTournament) {
        fishWithId.price *= 2;
      }
      
      setCurrentFish(fishWithId);
      
      // Calculate XP based on price/rarity
      const xpGained = Math.floor(fishWithId.price / 5) + 10;
      
      setPlayerState(prev => {
        let newXp = prev.xp + xpGained;
        let newLevel = prev.level;
        const xpNeeded = newLevel * 100;
        
        if (newXp >= xpNeeded) {
          newLevel++;
          newXp -= xpNeeded;
          // Could add a level up notification here
        }
        
        return {
          ...prev,
          level: newLevel,
          xp: newXp
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
    return rod?.multiplier || 1;
  };

  const isMagicBait = playerState.equipped.bait === 'bait_magic';
  const currentRodCustomization = playerState.rodCustomization[playerState.equipped.rod];

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
      const downloadLink = finishedOp.response?.generatedVideos?.[0]?.video?.uri;
      
      if (downloadLink) {
        setVideoStatus('Downloading video...');
        const videoUrl = await getDownloadUrl(downloadLink);
        const completeFish = { ...currentFish, video: videoUrl };
        setCurrentFish(completeFish);
        
        // Update in fishdex if already saved
        const newDex = fishdex.map(f => f.id === currentFish.id ? completeFish : f);
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

  return (
    <div className="relative w-full h-screen overflow-hidden bg-zinc-900 font-sans">
      
      {state === 'MAP' && <MapView spots={customSpots} onProximityChange={setProximity} />}
      
      {state !== 'MAP' && <Camera ref={cameraRef} />}
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2">
          {state !== 'MAP' && (
            <button 
              onClick={() => setState('MAP')}
              className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-white border border-white/10 pointer-events-auto hover:bg-black/80"
            >
              <ChevronLeft size={16} />
              <span className="text-sm font-medium">Back to Map</span>
            </button>
          )}
          
          {waterType && state !== 'MAP' && (
            <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-white border border-white/10 pointer-events-auto">
              <MapPin size={16} className="text-blue-400" />
              <span className="text-sm font-medium capitalize">
                {waterType} detected
              </span>
            </div>
          )}
          
          <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-yellow-400 border border-white/10 pointer-events-auto font-bold">
            <Coins size={16} />
            {playerState.money}
          </div>
          
          <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 flex flex-col gap-1 border border-white/10 pointer-events-auto w-32">
            <div className="flex justify-between items-center text-xs font-bold text-white">
              <span>LVL {playerState.level}</span>
              <span className="text-white/50">{playerState.xp}/{playerState.level * 100}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                style={{ width: `${(playerState.xp / (playerState.level * 100)) * 100}%` }}
              />
            </div>
          </div>
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
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentRodCustomization?.color || '#fff' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {SHOP_ITEMS.rods.find(r => r.id === playerState.equipped.rod)?.name}
            </span>
          </div>

          <button 
            onClick={() => setShowMapSpots(true)}
            className="bg-black/40 backdrop-blur-md rounded-full p-3 text-white border border-white/10 hover:bg-black/60 transition-colors"
          >
            <MapIcon size={20} />
          </button>
          <button 
            onClick={() => setShowFishdex(true)}
            className="bg-black/40 backdrop-blur-md rounded-full p-3 text-white border border-white/10 hover:bg-black/60 transition-colors"
          >
            <PackageOpen size={20} />
          </button>
          <button 
            onClick={() => setShowShop(true)}
            className="bg-black/40 backdrop-blur-md rounded-full p-3 text-white border border-white/10 hover:bg-black/60 transition-colors"
          >
            <Store size={20} />
          </button>
          <button 
            onClick={() => setShowLeaderboard(true)}
            className="bg-black/40 backdrop-blur-md rounded-full p-3 text-white border border-white/10 hover:bg-black/60 transition-colors"
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
            <button 
              onClick={() => setState('CAMERA')}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 py-4 font-bold text-lg shadow-lg flex items-center gap-3"
            >
              <CameraIcon size={24} />
              Open Camera to Fish
            </button>
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
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 py-4 font-bold text-lg shadow-lg flex items-center gap-3"
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
            onBreak={() => setState('BROKEN')}
            onEscape={() => setState('ESCAPED')}
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
                {currentFish.video ? (
                  <video 
                    src={currentFish.video} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover mix-blend-screen"
                    style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                  />
                ) : currentFish.image ? (
                  <img src={currentFish.image} alt={currentFish.name} className="w-full h-full object-cover" />
                ) : isGeneratingImage ? (
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
                    disabled={!proximity.isNearBaitShop}
                    className={`flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${proximity.isNearBaitShop ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
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
                {!proximity.isNearBaitShop && (
                  <p className="text-[10px] text-orange-400 mt-2 font-bold uppercase tracking-wider">Must be at a Bait Shop to sell</p>
                )}
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
              {state === 'BROKEN' ? 'LINE BROKE!' : 'IT GOT AWAY!'}
            </h2>
            <p className="text-white/80 text-lg mb-8 text-center">
              {state === 'BROKEN' ? 'You reeled in too hard. Watch the tension!' : 'You were too slow. Keep the tension up!'}
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
            className="absolute inset-0 z-50 bg-zinc-950 flex flex-col"
          >
            <div className="p-4 flex justify-between items-center border-b border-white/10 bg-zinc-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <PackageOpen size={24} className="text-blue-400" />
                Fishdex
              </h2>
              <button 
                onClick={() => setShowFishdex(false)}
                className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {fishdex.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/40">
                  <Fish size={48} className="mb-4 opacity-20" />
                  <p>Your Fishdex is empty.</p>
                  <p className="text-sm">Go catch some fish!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {fishdex.map((fish) => (
                    <div key={fish.id} className="bg-zinc-900 rounded-2xl p-3 border border-white/5 flex flex-col items-center text-center relative group">
                      <div className="w-full aspect-square bg-black/50 rounded-xl mb-3 overflow-hidden flex items-center justify-center relative">
                        {fish.video ? (
                          <video 
                            src={fish.video} 
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                            className="w-full h-full object-cover mix-blend-screen"
                            style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                          />
                        ) : fish.image ? (
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
                        disabled={!proximity.isNearBaitShop}
                        className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${proximity.isNearBaitShop ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-black' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
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
          <MapSpots onClose={() => setShowMapSpots(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
