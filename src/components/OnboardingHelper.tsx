import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, MapPin, Camera, Fish, Coins, Shield } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to Fishermon GO!",
    description: "The world is your fishing hole. Use your real-world location to find the best spots and catch legendary fish.",
    icon: <GlobeIcon />,
    color: "bg-blue-500"
  },
  {
    title: "Find Water on the Map",
    description: "Look for blue areas on your map. Walk towards them in the real world to get close enough to fish.",
    icon: <MapPin size={48} />,
    color: "bg-emerald-500"
  },
  {
    title: "Scan with AR",
    description: "Once you're at the water, point your camera and scan. Our Gemini AI will detect the water type and spawn unique fish.",
    icon: <Camera size={48} />,
    color: "bg-purple-500"
  },
  {
    title: "The Perfect Cast",
    description: "Swing your phone forward to cast! Wait for a bite, then yank back (or tap) to hook the fish.",
    icon: <Fish size={48} />,
    color: "bg-red-500"
  },
  {
    title: "Reel & Tension",
    description: "Hold the REEL button to pull the fish in. Keep the tension in the green zone or your line might snap!",
    icon: <Shield size={48} />,
    color: "bg-orange-500"
  },
  {
    title: "Sell & Upgrade",
    description: "Sell your catches at Bait Shops (Gas Stations) to earn coins. Buy better rods, lures, and even a World Passport!",
    icon: <Coins size={48} />,
    color: "bg-yellow-500"
  }
];

function GlobeIcon() {
  return (
    <div className="relative">
      <div className="w-16 h-16 rounded-full bg-blue-400/20 animate-pulse absolute -inset-4" />
      <span className="text-6xl relative z-10">🌍</span>
    </div>
  );
}

export function OnboardingHelper({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="p-8 flex-1 flex flex-col items-center text-center">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex flex-col items-center gap-8"
          >
            <div className={`w-24 h-24 rounded-3xl ${STEPS[currentStep].color} flex items-center justify-center text-white shadow-2xl shadow-current/20`}>
              {STEPS[currentStep].icon}
            </div>
            
            <div>
              <h2 className="text-3xl font-black text-white mb-4 leading-tight">
                {STEPS[currentStep].title}
              </h2>
              <p className="text-white/60 text-lg font-medium leading-relaxed">
                {STEPS[currentStep].description}
              </p>
            </div>
          </motion.div>
        </div>

        <div className="p-8 bg-white/5 border-t border-white/5 flex flex-col gap-6">
          <div className="flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-white/10'}`} 
              />
            ))}
          </div>

          <div className="flex gap-4">
            {currentStep > 0 && (
              <button 
                onClick={prev}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <ChevronLeft size={20} /> Back
              </button>
            )}
            <button 
              onClick={next}
              className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              {currentStep === STEPS.length - 1 ? 'Start Fishing' : 'Next'} <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
