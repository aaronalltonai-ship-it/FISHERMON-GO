import { useState, useRef, useEffect } from 'react';
import { Camera, CameraRef } from './components/Camera';
import { GodlyAROverlay } from './components/GodlyAROverlay';
import { TensionReeling } from './components/TensionReeling';
import { Shop } from './components/Shop';
import { Leaderboard } from './components/Leaderboard';
import { MapSpots } from './components/MapSpots';
import { MapView } from './components/MapView';
import { PlayerProfile } from './components/PlayerProfile';
import { GlobalTicker } from './components/GlobalTicker';
import { OnboardingHelper } from './components/OnboardingHelper';
import { MusicManager } from './components/MusicManager';
import { VoiceAssistant } from './components/VoiceAssistant';
import { detectWater, generateFishStats, generateMonsterStats, generateFishImage, generateFishVideo, pollVideoOperation, getDownloadUrl, generatePresetVideos } from './lib/gemini';
import { MapPin, Fish, Loader2, Crosshair, PackageOpen, X, Camera as CameraIcon, Store, Trophy, Coins, Map as MapIcon, ChevronLeft, Video, Play, Sparkles, Shield, User, Mic } from 'lucide-react';
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
  id: Math.random().toString(36).substr(2, 9),
  email: 'aaronalltonai@gmail.com',
  name: 'Aaron',
  money: 2500,
  level: 1,
  xp: 0,
  hasPassport: false,
  inventory: {
    rods: ['rod_basic'],
    lures: ['lure_none'],
    baits: ['bait_bread'],
    boats: ['boat_none'],
    chum: 2
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
  licenseExpiry: Date.now() + 24 * 60 * 60 * 1000,
  stamina: 100,
  maxStamina: 100,
  lastStaminaRegen: Date.now()
};

export default function App() {
  const [state, setState] = useState<GameState>('MAP');
  const [waterType, setWaterType] = useState<string | null>(null);
  const [currentFish, setCurrentFish] = useState<FishData | null>(null);
  const [fishdex, setFishdex] = useState<FishData[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);
  const [otherPlayers, setOtherPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [tickerEvents, setTickerEvents] = useState<any[]>([]);
  const [currentTension, setCurrentTension] = useState(0);
  const [bobberPos, setBobberPos] = useState<{ x: number, y: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [customSpots, setCustomSpots] = useState<Array<{ lat: number; lng: number; name: string; type: string }>>([]);
  
  const [showFishdex, setShowFishdex] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [shopTab, setShopTab] = useState<'rods' | 'lures' | 'baits' | 'boats' | 'consumables' | 'license'>('rods');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMapSpots, setShowMapSpots] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);
  const [isMonsterEncounter, setIsMonsterEncounter] = useState(false);
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [presetVideo, setPresetVideo] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [proximity, setProximity] = useState({ isNearBaitShop: false, isNearTournament: false, isNearRanger: false, locationType: 'rural' as 'urban' | 'rural' });
  const [castPower, setCastPower] = useState(0);
  const [isCasting, setIsCasting] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  
  const cameraRef = useRef<CameraRef>(null);
  const lastMotionRef = useRef<{ x: number, y: number, z: number }>({ x: 0, y: 0, z: 0 });
  const motionThreshold = 15; // Threshold for casting/hooking motion

  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      if (!event.accelerationIncludingGravity) return;
      const { x, y, z } = event.accelerationIncludingGravity;
      if (x === null || y === null || z === null) return;

      const deltaX = Math.abs(x - lastMotionRef.current.x);
      const deltaY = Math.abs(y - lastMotionRef.current.y);
      const deltaZ = Math.abs(z - lastMotionRef.current.z);
      const totalMotion = deltaX + deltaY + deltaZ;

      if (totalMotion > motionThreshold) {
        if (state === 'READY' && !isCasting) {
          // Cast motion detected (forward swing)
          handleCast();
        } else if (state === 'BITING') {
          // Hook set motion detected (yank back)
          handleHook();
        }
      }

      lastMotionRef.current = { x, y, z };
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    }
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [state, isCasting]);

  // Stamina regeneration
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayerState(prev => {
        if (prev.stamina < prev.maxStamina) {
          return {
            ...prev,
            stamina: Math.min(prev.maxStamina, prev.stamina + 1),
            lastStaminaRegen: Date.now()
          };
        }
        return prev;
      });
    }, 5000); // 1 stamina every 5 seconds
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    // Handle million coins for specific user
    if (playerState.email === 'aaronalltonai@gmail.com' && playerState.money < 1000000) {
      setPlayerState(prev => ({ ...prev, money: 1000000 }));
    }

    // WebSocket Connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        player: {
          id: playerState.id,
          name: playerState.name,
          level: playerState.level,
          hasPassport: playerState.hasPassport,
          location: playerState.location
        }
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'presence') {
        setOtherPlayers(data.players.filter((p: any) => p.id !== playerState.id));
      }
      if (data.type === 'catch_ticker') {
        setTickerEvents(prev => [...prev, { ...data, id: Math.random().toString(36).substr(2, 9) }]);
      }
    };

    setWs(socket);
    return () => socket.close();
  }, [playerState.id, playerState.name, playerState.email]);

  // Update location in WebSocket
  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN && playerState.location) {
      ws.send(JSON.stringify({
        type: 'update_location',
        location: playerState.location
      }));
    }
  }, [playerState.location, ws]);

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

    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    // Handle Stripe payment success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      setPlayerState(prev => ({
        ...prev,
        money: prev.money + 5000
      }));
      alert("Payment successful! 5,000 coins added to your account.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('playerState', JSON.stringify(playerState));
  }, [playerState]);

  useEffect(() => {
    localStorage.setItem('customSpots', JSON.stringify(customSpots));
  }, [customSpots]);
  
  useEffect(() => {
    if (proximity.isNearRanger && playerState.licenseExpiry < Date.now()) {
      const fineAmount = 500;
      if (playerState.money >= fineAmount) {
        alert(`A Park Ranger caught you fishing without a license! You've been fined $${fineAmount}.`);
        setPlayerState(prev => ({
          ...prev,
          money: prev.money - fineAmount,
          licenseExpiry: Date.now() + 3600000 // 1 hour emergency license after fine
        }));
      } else {
        alert("A Park Ranger caught you fishing without a license! Since you can't afford the fine, they've confiscated some of your XP.");
        setPlayerState(prev => ({
          ...prev,
          xp: Math.max(0, prev.xp - 50),
          licenseExpiry: Date.now() + 3600000
        }));
      }
    }
  }, [proximity.isNearRanger]);

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

  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      if (state === 'CAMERA' && !isCasting) {
        const acc = event.accelerationIncludingGravity;
        if (acc && acc.z && acc.z > 15) { // Threshold for a forward swing
          handleCast();
        }
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setOrientation({
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0
      });
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [state, isCasting]);

  const handleCast = () => {
    if (playerState.licenseExpiry < Date.now()) {
      alert("Your fishing license has expired! You must renew it to fish.");
      setShowShop(true);
      return;
    }
    if (playerState.stamina < 10) {
      alert("You're too tired to cast! Drink an energy drink or wait for stamina to recover.");
      return;
    }

    setIsCasting(true);
    setBobberPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setPlayerState(prev => ({ ...prev, stamina: prev.stamina - 10 }));

    // Visual feedback for casting
    if (navigator.vibrate) {
      navigator.vibrate([50, 20, 50]);
    }

    setTimeout(() => {
      setState('WAITING');
      setIsCasting(false);
      
      // Magic bait reduces wait time slightly, but base time is longer now
      const baitItem = SHOP_ITEMS.baits.find(b => b.id === playerState.equipped.bait);
      const isMagic = baitItem?.id === 'bait_magic';
      
      // Base wait time is 10-20 seconds to make it feel slower/more realistic
      let waitTime = Math.random() * 10000 + 10000;
      
      if (isMagic) {
        waitTime *= 0.5; // 50% faster
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
            }, 2500); // Shorter window to hook to increase difficulty
            
            return 'BITING';
          }
          return currentState;
        });
      }, waitTime);
    }, 500);
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
      if (navigator.vibrate) {
        navigator.vibrate(200); // Sharp hook set vibration
      }
      
      // 10% chance of monster in big water bodies
      const isBigWater = waterType === 'lake' || waterType === 'ocean';
      const monsterChance = isBigWater ? 0.1 : 0.01;
      const isMonster = Math.random() < monsterChance;
      
      setIsMonsterEncounter(isMonster);
      setState('REELING');
    }
  };

  const handleCatch = async () => {
    setState('CAUGHT');
    setIsGeneratingImage(true);
    setBobberPos(null);
    setCurrentTension(0);
    try {
      const lureItem = SHOP_ITEMS.lures.find(l => l.id === playerState.equipped.lure);
      const baitItem = SHOP_ITEMS.baits.find(b => b.id === playerState.equipped.bait);
      const boatItem = SHOP_ITEMS.boats.find(b => b.id === playerState.equipped.boat);
      
      let stats;
      if (isMonsterEncounter) {
        stats = await generateMonsterStats(waterType || 'mysterious water');
      } else {
        stats = await generateFishStats(
          waterType || 'mysterious water',
          lureItem?.name || 'No Lure',
          baitItem?.name || 'Bread',
          boatItem?.name || 'Shore'
        );
      }
      
      const fishWithId = { ...stats, id: Date.now().toString(), caughtAt: Date.now() };
      
      // Tournament bonus: 2x price and XP if in tournament zone
      if (proximity.isNearTournament) {
        fishWithId.price *= 2;
      }
      
      setCurrentFish(fishWithId);
      
      // Emit catch event for global ticker
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'catch',
          playerName: playerState.name,
          fishName: stats.name,
          rarity: stats.rarity
        }));
      }
      
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
      setBobberPos(null);
      setCurrentTension(0);
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
      
      {state === 'MAP' && (
        <MapView 
          spots={customSpots} 
          players={otherPlayers}
          onProximityChange={setProximity} 
          onPlayerClick={setSelectedPlayer}
          onAddSpot={(spot) => setCustomSpots(prev => [...prev, spot])}
        />
      )}
      
      {state !== 'MAP' && <Camera ref={cameraRef} />}
      
      <GodlyAROverlay 
        state={state} 
        tension={currentTension} 
        rodTipPos={{ x: window.innerWidth * 0.8, y: window.innerHeight * 0.9 }}
        bobberPos={bobberPos}
        isUnderwater={state === 'WAITING' || state === 'BITING' || state === 'REELING'}
      />
      
      {/* Top Bar - Commercial Style */}
      <div className="absolute top-0 left-0 right-0 p-6 z-30 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2 text-white font-black italic tracking-tighter drop-shadow-md">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xl uppercase">{fishdex.length} FISH</span>
        </div>
        
        <div className="flex gap-4 pointer-events-auto">
          <button 
            onClick={() => setShowMapSpots(true)}
            className="text-white drop-shadow-md hover:scale-110 transition-transform"
          >
            <CameraIcon size={28} />
          </button>
          <button 
            onClick={() => setShowFishdex(true)}
            className="text-white drop-shadow-md hover:scale-110 transition-transform"
          >
            <PackageOpen size={28} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showOnboarding && (
          <OnboardingHelper 
            onComplete={() => {
              setShowOnboarding(false);
              localStorage.setItem('hasSeenOnboarding', 'true');
            }} 
          />
        )}
      </AnimatePresence>

      <GlobalTicker events={tickerEvents} />

      <MusicManager 
        gameState={state} 
        locationType={proximity.locationType} 
        isMonster={isMonsterEncounter} 
      />

      <VoiceAssistant 
        isOpen={showVoiceAssistant} 
        onClose={() => setShowVoiceAssistant(false)} 
      />

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
              className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-full px-12 py-4 font-black text-xl italic tracking-tighter shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center gap-3 pointer-events-auto border-2 border-white/20"
            >
              <CameraIcon size={24} />
              OPEN CAMERA
            </button>
          </motion.div>
        )}

        {state === 'CAMERA' && (
          <motion.div 
            key="camera-ui"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 left-0 right-0 flex flex-col items-center z-10 gap-6"
          >
            <div className="w-64 h-3 bg-white/20 rounded-full overflow-hidden border border-white/10 backdrop-blur-md">
              <motion.div 
                className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${(playerState.stamina / playerState.maxStamina) * 100}%` }}
              />
            </div>

            <button 
              onClick={handleScan}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-black text-2xl italic tracking-tighter shadow-2xl active:scale-90 transition-all pointer-events-auto border-4 border-white/20"
            >
              SCAN
            </button>
          </motion.div>
        )}

        {state === 'READY' && (
          <motion.div 
            key="ready-ui"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 left-0 right-0 flex flex-col items-center z-10 gap-6"
          >
            <div className="w-64 h-3 bg-white/20 rounded-full overflow-hidden border border-white/10 backdrop-blur-md">
              <motion.div 
                className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${(playerState.stamina / playerState.maxStamina) * 100}%` }}
              />
            </div>

            <button 
              onClick={handleCast}
              disabled={isCasting}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-black text-2xl italic tracking-tighter shadow-2xl active:scale-90 transition-all pointer-events-auto border-4 border-white/20"
            >
              CAST
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
                  onError={(e) => {
                    console.warn("Preset video failed to load", e);
                    setPresetVideo(null);
                  }}
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


        {state === 'WAITING' && (
          <motion.div 
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-64 h-64 border-2 border-white/20 rounded-full"
              />
              <motion.div 
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="absolute inset-0 w-64 h-64 border border-white/10 rounded-full"
              />
            </div>
            
            <p className="text-white font-black text-xl italic tracking-tighter drop-shadow-lg animate-pulse">
              WAITING FOR BITE...
            </p>
          </motion.div>
        )}

        {state === 'BITING' && (
          <motion.div 
            key="biting"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-500/10"
          >
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="absolute inset-0 w-48 h-48 -translate-x-1/2 -translate-y-1/2 border-4 border-red-500 rounded-full"
              />
              <button 
                onClick={handleHook}
                className="w-32 h-32 rounded-full bg-red-600 border-4 border-white shadow-[0_0_50px_rgba(220,38,38,0.8)] flex items-center justify-center pointer-events-auto cursor-pointer relative z-10 active:scale-90 transition-transform"
              >
                <Fish size={60} className="text-white" />
              </button>
            </div>
            <p className="text-white font-black text-3xl italic tracking-tighter mt-12 animate-bounce drop-shadow-lg">
              STRIKE!
            </p>
          </motion.div>
        )}

        {state === 'BITING' && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                y: [0, -20, 0],
                opacity: [0.4, 0.8, 0.4]
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="relative"
            >
              <div className="w-32 h-32 bg-blue-500/20 blur-3xl rounded-full absolute -inset-8" />
              <Fish size={80} className="text-blue-400/40 rotate-90" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-white/10 backdrop-blur-md px-4 py-1 rounded-full border border-white/20">
                <span className="text-white font-black text-sm animate-pulse">STRIKE! HOOK IT!</span>
              </div>
            </motion.div>
          </div>
        )}

        {state === 'REELING' && (
          <div className="absolute inset-0 z-20">
            {/* AR Fish struggling in the background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
              <motion.div
                animate={{ 
                  x: [
                    (orientation.gamma * 2) + (Math.random() * -50), 
                    (orientation.gamma * 2) + (Math.random() * 50)
                  ],
                  y: [
                    (orientation.beta * 2) + (Math.random() * -50), 
                    (orientation.beta * 2) + (Math.random() * 50)
                  ],
                  rotate: [0, 360],
                  scale: [0.8, 1.2]
                }}
                transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
              >
                <Fish size={120} className={isMonsterEncounter ? 'text-red-500' : 'text-blue-400'} />
              </motion.div>
            </div>
            
            <TensionReeling 
              rodMultiplier={getRodMultiplier()}
              isMonster={isMonsterEncounter}
              onTensionChange={setCurrentTension}
              onCatch={handleCatch}
              onBreak={() => {
                // Monsters break poles!
                if (isMonsterEncounter) {
                  setPlayerState(prev => ({
                    ...prev,
                    equipped: { ...prev.equipped, rod: 'rod_basic' },
                    inventory: { ...prev.inventory, rods: prev.inventory.rods.filter(r => r === 'rod_basic') }
                  }));
                  alert("THE MONSTER SNAPPED YOUR POLE! It's gone forever...");
                }
                setState('BROKEN');
                setBobberPos(null);
                setCurrentTension(0);
              }}
              onEscape={() => {
                setState('ESCAPED');
                setBobberPos(null);
                setCurrentTension(0);
              }}
            />
          </div>
        )}

        {state === 'CAUGHT' && currentFish && (
          <motion.div 
            key="caught"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6"
          >
            <div className="w-full max-w-md flex flex-col items-center">
              <div className="flex items-center gap-2 text-white font-black italic tracking-tighter mb-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xl uppercase">NEW CATCH</span>
              </div>
              
              <h2 className="text-4xl font-black text-white italic tracking-tighter mb-1 uppercase text-center drop-shadow-lg">
                {currentFish.name}
              </h2>
              
              <div className="flex items-center gap-4 text-cyan-400 font-black italic tracking-tighter mb-8 text-xl">
                <span>{currentFish.weightKg.toFixed(1)} lb</span>
                <span className="text-white/20">|</span>
                <span>{currentFish.lengthCm} in</span>
              </div>

              <div className="relative w-full aspect-square mb-8">
                {isGeneratingImage ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-white mb-4" size={48} />
                    <p className="text-white font-bold animate-pulse uppercase tracking-widest text-xs">Developing Photo...</p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full h-full"
                  >
                    <FishVisual rarity={currentFish.rarity} color={currentFish.color} size={160} />
                  </motion.div>
                )}
              </div>

              <div className="flex flex-col gap-4 w-full px-8">
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `I caught a ${currentFish.name}!`,
                        text: `Check out my ${currentFish.weightKg.toFixed(1)}lb catch in Ultimatr AR Fishing!`,
                        url: window.location.href
                      });
                    }
                  }}
                  className="w-full py-4 bg-white text-black font-black text-xl italic tracking-tighter rounded-xl shadow-xl active:scale-95 transition-all uppercase"
                >
                  SHARE
                </button>
                
                <button 
                  onClick={() => handleSellFish(currentFish)}
                  className="w-full py-4 bg-white/10 text-white font-black text-xl italic tracking-tighter rounded-xl border border-white/20 active:scale-95 transition-all uppercase"
                >
                  CONTINUE
                </button>
              </div>

              <div className="mt-12 flex items-center gap-2 text-white/40 font-bold">
                <Trophy size={20} />
                <span>132</span>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 border-2 border-white/20" />
                <div className="flex flex-col">
                  <span className="text-white font-black text-sm italic tracking-tighter">@YourNameMTS</span>
                  <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Join me on Ultimatr</span>
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
                            onError={(e) => {
                              console.warn("Fishdex video failed to load", e);
                              const updatedFish = { ...fish, video: undefined };
                              setFishdex(prev => prev.map(f => f.id === fish.id ? updatedFish : f));
                            }}
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
            initialTab={shopTab}
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

        <AnimatePresence>
          {selectedPlayer && (
            <PlayerProfile 
              player={selectedPlayer} 
              isMe={selectedPlayer.id === playerState.id}
              onClose={() => setSelectedPlayer(null)} 
            />
          )}
        </AnimatePresence>
      </AnimatePresence>

      <AnimatePresence>
        {showMapSpots && (
          <MapSpots onClose={() => setShowMapSpots(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
