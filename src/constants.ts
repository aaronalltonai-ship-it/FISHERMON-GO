export const SHOP_ITEMS = {
  rods: [
    { id: 'rod_basic', name: 'Basic Rod', price: 0, multiplier: 1, desc: 'A simple wooden rod.' },
    { id: 'rod_fiberglass', name: 'Fiberglass Rod', price: 1500, multiplier: 1.2, desc: 'Better tension control.' },
    { id: 'rod_carbon', name: 'Carbon Fiber Rod', price: 5000, multiplier: 1.5, desc: 'Lightweight and strong.' },
    { id: 'rod_pro', name: 'Pro Tournament Rod', price: 25000, multiplier: 2.5, desc: 'For serious anglers.' },
  ],
  lures: [
    { id: 'lure_none', name: 'No Lure', price: 0, desc: 'Just a hook.' },
    { id: 'lure_spinner', name: 'Spinner', price: 500, desc: 'Attracts common fish.' },
    { id: 'lure_jig', name: 'Jig', price: 1200, desc: 'Good for bottom feeders.' },
    { id: 'lure_crankbait', name: 'Crankbait', price: 3500, desc: 'Attracts larger predators.' },
  ],
  baits: [
    { id: 'bait_bread', name: 'Bread', price: 50, desc: 'Cheap and effective for small fish.' },
    { id: 'bait_worm', name: 'Worm', price: 200, desc: 'A classic choice.' },
    { id: 'bait_minnow', name: 'Minnow', price: 800, desc: 'Live bait for bigger catches.' },
    { id: 'bait_magic', name: 'Magic Bait', price: 5000, desc: 'Increases rare encounter rate.' },
  ],
  boats: [
    { id: 'boat_none', name: 'Shore Fishing', price: 0, desc: 'Fishing from the edge.' },
    { id: 'boat_kayak', name: 'Kayak', price: 15000, desc: 'Access slightly deeper waters.' },
    { id: 'boat_motor', name: 'Motorboat', price: 75000, desc: 'Reach the best fishing spots.' },
    { id: 'boat_yacht', name: 'Luxury Yacht', price: 2500000, desc: 'The ultimate fishing experience.' },
  ],
  consumables: [
    { id: 'chum_bucket', name: 'Chum Bucket', price: 250, desc: 'Throw in water to instantly attract fish and reduce wait time.' },
    { id: 'premium_chum', name: 'Premium Chum', price: 1000, desc: 'Attracts bigger fish instantly.' }
  ]
};
