import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Coins, Anchor, Droplet, Fish as FishIcon, Ship, Palette, Check, PackageOpen, Store, Shield, CreditCard, Clock } from 'lucide-react';
import { SHOP_ITEMS } from '../constants';
import { PlayerState, RodCustomization } from '../types';

interface Props {
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  onClose: () => void;
  isNearBaitShop: boolean;
  initialTab?: 'rods' | 'lures' | 'baits' | 'boats' | 'consumables' | 'license';
}

const COLORS = ['#ffffff', '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ffa500'];
const DECALS = ['none', 'flames', 'waves', 'stars', 'stripes', 'dots'];

export function Shop({ playerState, setPlayerState, onClose, isNearBaitShop, initialTab = 'rods' }: Props) {
  const [activeTab, setActiveTab] = useState<'rods' | 'lures' | 'baits' | 'boats' | 'consumables' | 'license'>(initialTab);
  const [customizingRod, setCustomizingRod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuyLicense = (days: number, price: number) => {
    if (playerState.money >= price) {
      setPlayerState(prev => ({
        ...prev,
        money: prev.money - price,
        licenseExpiry: Math.max(Date.now(), prev.licenseExpiry) + days * 24 * 60 * 60 * 1000
      }));
      alert(`License extended by ${days} days!`);
    } else {
      alert("Not enough money!");
    }
  };

  const handleBuyCoins = async (amount: number, price: number) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          price,
          successUrl: window.location.origin + '?payment=success',
          cancelUrl: window.location.origin + '?payment=cancel',
        }),
      });

      const session = await response.json();
      if (session.error) throw new Error(session.error);
      if (!session.url) throw new Error("No checkout URL returned from server");
      
      window.location.href = session.url;
    } catch (err: any) {
      console.error(err);
      alert(`Payment failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuy = (category: keyof typeof SHOP_ITEMS, item: any) => {
    if (!isNearBaitShop) return;
    
    if (category === 'consumables') {
      if (playerState.money >= item.price) {
        setPlayerState(prev => {
          const newState = { ...prev, money: prev.money - item.price };
          
          if (item.id === 'energy_drink') {
            newState.stamina = Math.min(prev.maxStamina, prev.stamina + 50);
            alert("Energy drink consumed! Restored 50 stamina.");
          } else if (item.id === 'stamina_boost') {
            newState.maxStamina = prev.maxStamina + 10;
            newState.stamina = prev.stamina + 10;
            alert("Max stamina increased by 10!");
          } else {
            newState.inventory = {
              ...prev.inventory,
              chum: prev.inventory.chum + 1
            };
          }
          return newState;
        });
      } else {
        alert("Not enough money!");
      }
      return;
    }

    if (playerState.money >= item.price && !playerState.inventory[category].includes(item.id)) {
      setPlayerState(prev => {
        const newState = {
          ...prev,
          money: prev.money - item.price,
          inventory: {
            ...prev.inventory,
            [category]: [...prev.inventory[category], item.id]
          }
        };
        
        if (category === 'rods') {
          newState.rodCustomization = {
            ...prev.rodCustomization,
            [item.id]: { color: '#ffffff', decal: 'none' }
          };
        }
        
        return newState;
      });
      
      if (category === 'rods') {
        setCustomizingRod(item.id);
      }
    }
  };

  const handleEquip = (category: keyof typeof SHOP_ITEMS, itemId: string) => {
    // Map category to equipped key
    const equipKey = category.slice(0, -1) as keyof PlayerState['equipped'];
    setPlayerState(prev => ({
      ...prev,
      equipped: {
        ...prev.equipped,
        [equipKey]: itemId
      }
    }));
  };

  const saveCustomization = (rodId: string, color: string, decal: string) => {
    setPlayerState(prev => ({
      ...prev,
      rodCustomization: {
        ...prev.rodCustomization,
        [rodId]: { color, decal }
      }
    }));
    setCustomizingRod(null);
  };

  const renderItems = (category: keyof typeof SHOP_ITEMS) => {
    const items = SHOP_ITEMS[category];
    const equipKey = category !== 'consumables' ? category.slice(0, -1) as keyof PlayerState['equipped'] : null;
    
    return (
      <div className="grid grid-cols-1 gap-3 overflow-y-auto pb-20">
        {items.map(item => {
          const isConsumable = category === 'consumables';
          const isOwned = isConsumable ? false : playerState.inventory[category as keyof Omit<PlayerState['inventory'], 'chum'>].includes(item.id);
          const isEquipped = equipKey ? playerState.equipped[equipKey] === item.id : false;
          const canAfford = playerState.money >= item.price;
          const customization = playerState.rodCustomization?.[item.id];

          return (
            <div key={item.id} className="bg-zinc-800/50 border border-white/10 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
              {category === 'rods' && customization && (
                <div 
                  className="absolute top-0 right-0 w-1 h-full opacity-50" 
                  style={{ backgroundColor: customization.color }}
                />
              )}
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2">
                    {item.name}
                    {isConsumable && item.id.includes('chum') && (
                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/70">Owned: {playerState.inventory.chum}</span>
                    )}
                    {category === 'rods' && isOwned && (
                      <button 
                        onClick={() => setCustomizingRod(item.id)}
                        className="p-1 text-white/40 hover:text-white transition-colors"
                      >
                        <Palette size={14} />
                      </button>
                    )}
                  </h3>
                  <p className="text-white/50 text-xs">{item.desc}</p>
                </div>
                {(!isOwned || isConsumable) && (
                  <div className="flex items-center gap-1 text-yellow-400 font-bold bg-yellow-400/10 px-2 py-1 rounded-lg text-sm">
                    <Coins size={14} />
                    {item.price}
                  </div>
                )}
              </div>
              
              <div className="mt-2 flex justify-end gap-2">
                {isOwned && category === 'rods' && (
                  <button 
                    onClick={() => setCustomizingRod(item.id)}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-xs font-bold transition-colors border border-white/5"
                  >
                    Customize
                  </button>
                )}
                
                {isEquipped ? (
                  <button disabled className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-bold border border-blue-500/30">
                    Equipped
                  </button>
                ) : isOwned && !isConsumable ? (
                  <button 
                    onClick={() => handleEquip(category as any, item.id)}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-bold transition-colors"
                  >
                    Equip
                  </button>
                ) : (
                  <button 
                    onClick={() => handleBuy(category, item)}
                    disabled={!canAfford || !isNearBaitShop}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${canAfford && isNearBaitShop ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}`}
                  >
                    Buy
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLicense = () => {
    const isExpired = playerState.licenseExpiry < Date.now();
    const expiryDate = new Date(playerState.licenseExpiry).toLocaleDateString();

    return (
      <div className="flex flex-col gap-6 overflow-y-auto pb-20">
        <div className={`p-6 rounded-2xl border flex flex-col items-center text-center gap-4 ${isExpired ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
          <div className={`p-4 rounded-full ${isExpired ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
            <Shield size={48} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Fishing License</h3>
            <p className={`text-sm font-bold ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
              {isExpired ? 'EXPIRED' : `ACTIVE UNTIL ${expiryDate}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-white/50 text-xs uppercase font-bold tracking-widest px-2">Renew with In-Game Cash</h4>
          <button 
            onClick={() => handleBuyLicense(1, 500)}
            className="bg-zinc-800 border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="text-blue-400" size={20} />
              <div className="text-left">
                <div className="text-white font-bold">1 Day Extension</div>
                <div className="text-white/50 text-xs">Standard permit</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-yellow-400 font-bold bg-yellow-400/10 px-3 py-1 rounded-lg">
              <Coins size={14} /> 500
            </div>
          </button>
          <button 
            onClick={() => handleBuyLicense(7, 2500)}
            className="bg-zinc-800 border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="text-purple-400" size={20} />
              <div className="text-left">
                <div className="text-white font-bold">7 Day Extension</div>
                <div className="text-white/50 text-xs">Weekly permit</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-yellow-400 font-bold bg-yellow-400/10 px-3 py-1 rounded-lg">
              <Coins size={14} /> 2500
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-white/50 text-xs uppercase font-bold tracking-widest px-2">Premium Currency (Stripe)</h4>
          <button 
            onClick={() => handleBuyCoins(5000, 5)}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 p-4 rounded-xl flex justify-between items-center transition-colors shadow-lg"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="text-white" size={20} />
              <div className="text-left text-white">
                <div className="font-bold">Buy 5,000 Coins</div>
                <div className="text-white/70 text-xs">Instant delivery</div>
              </div>
            </div>
            <div className="text-white font-black text-lg">$5.00</div>
          </button>
          <p className="text-[10px] text-white/30 text-center italic">Secure payments powered by Stripe</p>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-zinc-950 flex flex-col"
    >
      <div className="p-4 flex justify-between items-center border-b border-white/10 bg-zinc-900">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Tackle Shop</h2>
          <button 
            onClick={() => setActiveTab('license')}
            className="flex items-center gap-1 text-yellow-400 font-bold bg-yellow-400/10 px-3 py-1 rounded-full text-sm hover:bg-yellow-400/20 transition-colors"
          >
            <Coins size={16} />
            {playerState.money}
          </button>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full"
        >
          <X size={24} />
        </button>
      </div>
      
      <div className="flex p-2 gap-2 bg-zinc-900 border-b border-white/5 overflow-x-auto no-scrollbar shrink-0">
        <TabButton active={activeTab === 'rods'} onClick={() => setActiveTab('rods')} icon={<Anchor size={16} />} label="Rods" />
        <TabButton active={activeTab === 'lures'} onClick={() => setActiveTab('lures')} icon={<FishIcon size={16} />} label="Lures" />
        <TabButton active={activeTab === 'baits'} onClick={() => setActiveTab('baits')} icon={<Droplet size={16} />} label="Baits" />
        <TabButton active={activeTab === 'boats'} onClick={() => setActiveTab('boats')} icon={<Ship size={16} />} label="Boats" />
        <TabButton active={activeTab === 'consumables'} onClick={() => setActiveTab('consumables')} icon={<PackageOpen size={16} />} label="Items" />
        <TabButton active={activeTab === 'license'} onClick={() => setActiveTab('license')} icon={<Shield size={16} />} label="License" />
      </div>

      {!isNearBaitShop && activeTab !== 'license' && (
        <div className="bg-orange-600/20 border-b border-orange-500/30 p-3 flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg">
            <Store size={18} className="text-white" />
          </div>
          <div>
            <p className="text-orange-200 text-xs font-bold">OUTSIDE SERVICE AREA</p>
            <p className="text-orange-200/70 text-[10px]">You must be at a Gas Station (Bait Shop) to purchase items.</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-4">
        {activeTab === 'license' ? renderLicense() : renderItems(activeTab)}
      </div>

      <AnimatePresence>
        {customizingRod && (
          <RodCustomizer 
            rodId={customizingRod}
            initialCustomization={playerState.rodCustomization[customizingRod]}
            onSave={(color, decal) => saveCustomization(customizingRod, color, decal)}
            onClose={() => setCustomizingRod(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RodCustomizer({ rodId, initialCustomization, onSave, onClose }: { 
  rodId: string, 
  initialCustomization: RodCustomization, 
  onSave: (color: string, decal: string) => void,
  onClose: () => void 
}) {
  const [color, setColor] = useState(initialCustomization.color);
  const [decal, setDecal] = useState(initialCustomization.decal);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute inset-0 z-[60] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-bold text-lg">Customize Rod</h3>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white"><X size={20} /></button>
        </div>

        <div className="mb-6">
          <label className="text-white/50 text-xs uppercase font-bold tracking-wider mb-3 block">Rod Color</label>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map(c => (
              <button 
                key={c}
                onClick={() => setColor(c)}
                className={`w-full aspect-square rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check size={16} className="mx-auto text-black drop-shadow-md" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label className="text-white/50 text-xs uppercase font-bold tracking-wider mb-3 block">Decal Style</label>
          <div className="grid grid-cols-3 gap-2">
            {DECALS.map(d => (
              <button 
                key={d}
                onClick={() => setDecal(d)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${decal === d ? 'bg-white text-black border-white' : 'bg-white/5 text-white/50 border-white/10'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => onSave(color, decal)}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg transition-all"
        >
          Save Customization
        </button>
      </div>
    </motion.div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  );
}
