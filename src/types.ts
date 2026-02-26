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

export interface DailyQuest {
  date: string;
  target: number;
  progress: number;
  reward: number;
  complete: boolean;
}

export interface PlayerState {
  money: number;
  level: number;
  xp: number;
  streak: number;
  lastWaterType?: string;
  dailyRewardLastClaim?: string;
  dailyQuest: DailyQuest;
  lifetimeCatches: number;
  lifetimeWeightKg: number;
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
}

