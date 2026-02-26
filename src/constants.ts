export const SHOP_ITEMS = {
  rods: [
    { id: 'rod_basic', name: 'Basic Rod', price: 0, multiplier: 1, desc: 'A simple wooden rod.' },
    { id: 'rod_fiberglass', name: 'Fiberglass Rod', price: 1500, multiplier: 1.2, desc: 'Better tension control.' },
    { id: 'rod_carbon', name: 'Carbon Fiber Rod', price: 15000, multiplier: 1.5, desc: 'Lightweight and strong.' },
    { id: 'rod_pro', name: 'Pro Tournament Rod', price: 100000, multiplier: 2.5, desc: 'For serious anglers.' },
    { id: 'rod_legendary', name: 'Golden Trident', price: 1000000, multiplier: 5.0, desc: 'A rod of legends.' },
  ],
  lures: [
    { id: 'lure_none', name: 'No Lure', price: 0, desc: 'Just a hook.' },
    { id: 'lure_spinner', name: 'Spinner', price: 2500, desc: 'Attracts common fish.' },
    { id: 'lure_jig', name: 'Jig', price: 8500, desc: 'Good for bottom feeders.' },
    { id: 'lure_crankbait', name: 'Crankbait', price: 25000, desc: 'Attracts larger predators.' },
    { id: 'lure_diamond', name: 'Diamond Spoon', price: 150000, desc: 'Irresistible to rare fish.' },
  ],
  baits: [
    { id: 'bait_bread', name: 'Bread', price: 150, desc: 'Cheap and effective for small fish.' },
    { id: 'bait_worm', name: 'Worm', price: 750, desc: 'A classic choice.' },
    { id: 'bait_minnow', name: 'Minnow', price: 2500, desc: 'Live bait for bigger catches.' },
    { id: 'bait_magic', name: 'Magic Bait', price: 15000, desc: 'Increases rare encounter rate.' },
  ],
  boats: [
    { id: 'boat_none', name: 'Shore Fishing', price: 0, desc: 'Fishing from the edge.' },
    { id: 'boat_kayak', name: 'Kayak', price: 50000, desc: 'Access slightly deeper waters.' },
    { id: 'boat_motor', name: 'Motorboat', price: 250000, desc: 'Reach the best fishing spots.' },
    { id: 'boat_yacht', name: 'Luxury Yacht', price: 5000000, desc: 'The ultimate fishing experience.' },
  ],
  consumables: [
    { id: 'chum_bucket', name: 'Chum Bucket', price: 500, desc: 'Throw in water to instantly attract fish and reduce wait time.' },
    { id: 'premium_chum', name: 'Premium Chum', price: 2500, desc: 'Attracts bigger fish instantly.' },
    { id: 'energy_drink', name: 'Energy Drink', price: 1000, desc: 'Instantly restores 50 stamina.' },
    { id: 'stamina_boost', name: 'Stamina Boost', price: 5000, desc: 'Increases max stamina by 10 permanently.' }
  ]
};

export const TOURNAMENTS = [
  { id: 'tourney_1', name: 'Central Park Bass Derby', location: { lat: 40.7812, lng: -73.9665 }, active: true, multiplier: 2.0, targetFish: 'Bass' },
  { id: 'tourney_2', name: 'Echo Lake Trout Classic', location: { lat: 34.0700, lng: -118.2600 }, active: true, multiplier: 1.5, targetFish: 'Trout' },
  { id: 'tourney_3', name: 'Golden Gate Salmon Run', location: { lat: 37.8199, lng: -122.4783 }, active: true, multiplier: 3.0, targetFish: 'Salmon' },
];
