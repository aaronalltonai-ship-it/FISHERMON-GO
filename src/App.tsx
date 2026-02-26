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
  inventory: {
    rods: ['rod_basic'],
    lures: ['lure_none'],
    baits: ['bait_bread'],
    boats: ['boat_none']
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
    setState('WAITING');
    // Magic bait reduces wait time
    const baitItem = SHOP_ITEMS.baits.find(b => b.id === playerState.equipped.bait);
    const isMagic = baitItem?.id === 'bait_magic';
    const waitTime = isMagic ? Math.random() * 2000 + 1000 : Math.random() * 5000 + 3000;
    
    setTimeout(() => {
      setState(currentState => {
        if (currentState === 'WAITING') {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          
          setTimeout(() => {
            setState(s => s === 'BITING' ? 'ESCAPED' : s);
          }, 3000);
          
          return 'BITING';
        }
        return currentState;
      });
    }, waitTime);
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
      setCurrentFish(fishWithId);
      
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
    <div className="relative w-full h-screen overflow-hidden app-shell">
      <div className="app-backdrop" />
      <div className="app-grid" />
      <div className="app-vignette" />
      
      {state === 'MAP' && <MapView spots={customSpots} />}
      
      {state !== 'MAP' && <Camera ref={cameraRef} />}
      
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
          
          <div className="hud-pill px-4 py-2 flex items-center gap-2 text-yellow-300 pointer-events-auto font-bold">
            <Coins size={16} className="hud-icon" />
            {playerState.money}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 pointer-events-auto">
          {isMagicBait && (
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="hud-pill px-3 py-1.5 flex items-center gap-2 text-purple-200 border border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              <Sparkles size={14} className="text-purple-300" />
              <span className="text-[10px] font-black uppercase tracking-widest">Magic Active</span>
            </motion.div>
          )}
          
          <div className="hud-pill px-3 py-1.5 flex items-center gap-2 text-white/80">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentRodCustomization?.color || '#fff' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {SHOP_ITEMS.rods.find(r => r.id === playerState.equipped.rod)?.name}
            </span>
          </div>

          <button 
            onClick={() => setShowMapSpots(true)}
            className="hud-button p-3 text-white transition-colors"
          >
            <MapIcon size={20} />
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
            <button 
              onClick={() => setState('CAMERA')}
              className="cta-primary text-white rounded-full px-8 py-4 font-bold text-lg flex items-center gap-3 tracking-wide"
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
              className="cta-secondary text-white rounded-full px-10 py-5 font-bold text-xl flex items-center gap-3 tracking-widest"
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
            <p className="text-white mt-8 font-medium text-lg drop-shadow-md">Waiting for a bite...</p>
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
              className="bg-rose-600 text-white rounded-full px-12 py-6 font-black text-3xl shadow-[0_0_50px_rgba(255,90,122,0.6)] animate-pulse"
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
            <div className="glass-panel rounded-3xl p-6 w-full max-w-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-32 opacity-30" style={{ backgroundColor: currentFish.color }} />
              
              <h2 className="text-4xl font-black text-white text-center mb-2 relative z-10 title-font">CAUGHT!</h2>
              
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
