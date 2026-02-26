export interface FishData {
  id: string;
  name: string;
  description: string;
  rarity: string;
  weightKg: number;
  lengthCm: number;
  color: string;
  price: number;
  image?: string;
  video?: string;
  caughtAt: number;
}

export interface RodCustomization {
  color: string;
  decal: string;
}

export interface PlayerState {
  money: number;
  level: number;
  xp: number;
  inventory: {
    rods: string[];
    lures: string[];
    baits: string[];
    boats: string[];
    chum: number;
  };
  equipped: {
    rod: string;
    lure: string;
    bait: string;
    boat: string;
  };
  rodCustomization: Record<string, RodCustomization>;
  licenseExpiry: number;
  stamina: number;
  maxStamina: number;
  lastStaminaRegen: number;
}

export interface Tournament {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  active: boolean;
  multiplier: number;
  targetFish?: string;
}
