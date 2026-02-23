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
  caughtAt: number;
}

export interface PlayerState {
  money: number;
  inventory: {
    rods: string[];
    lures: string[];
    baits: string[];
    boats: string[];
  };
  equipped: {
    rod: string;
    lure: string;
    bait: string;
    boat: string;
  };
}
