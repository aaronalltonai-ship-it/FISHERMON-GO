import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Map as MapIcon, Loader2, Navigation } from 'lucide-react';
import { findNearbyFishingSpots } from '../lib/gemini';
import Markdown from 'react-markdown';
import { PassportDestination } from '../types';

interface Props {
  onClose: () => void;
  overrideDestination?: PassportDestination | null;
}

export function MapSpots({ onClose, overrideDestination = null }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string, chunks: any[] } | null>(null);

  useEffect(() => {
    const loadSpots = async (lat: number, lng: number) => {
      try {
        const res = await findNearbyFishingSpots(lat, lng);
        setResult(res);
      } catch (err) {
        console.error(err);
        setError("Failed to find nearby spots.");
      } finally {
        setLoading(false);
      }
    };

    if (overrideDestination) {
      loadSpots(overrideDestination.lat, overrideDestination.lng);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        loadSpots(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        console.error(err);
        setError("Location access denied. Please enable location services to find nearby spots.");
        setLoading(false);
      }
    );
  }, [overrideDestination]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-zinc-950 flex flex-col"
    >
      <div className="p-4 flex justify-between items-center border-b border-white/10 bg-zinc-900">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MapIcon size={24} className="text-blue-400" />
          Nearby Spots
        </h2>
        <button 
          onClick={onClose}
          className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {overrideDestination && (
          <div className="glass-panel rounded-xl p-3 text-white/70 text-xs mb-4">
            Passport mode active: {overrideDestination.label}
          </div>
        )}
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-white/60">
            <Loader2 size={48} className="animate-spin mb-4 text-blue-400" />
            <p>Scanning local area for water bodies...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-red-400 text-center p-6">
            <MapIcon size={48} className="mb-4 opacity-50" />
            <p>{error}</p>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-6">
            <div className="bg-zinc-800/50 border border-white/10 rounded-xl p-4 text-white/90 prose prose-invert max-w-none prose-sm">
              <Markdown>{result.text}</Markdown>
            </div>
            
            {result.chunks && result.chunks.length > 0 && (
              <div>
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Navigation size={18} className="text-blue-400" />
                  Locations
                </h3>
                <div className="flex flex-col gap-3">
                  {result.chunks.map((chunk: any, i: number) => {
                    if (chunk.maps?.uri) {
                      return (
                        <a 
                          key={i} 
                          href={chunk.maps.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-zinc-900 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-zinc-800 transition-colors"
                        >
                          <div>
                            <h4 className="text-blue-400 font-bold">{chunk.maps.title || 'View on Google Maps'}</h4>
                          </div>
                          <Navigation size={16} className="text-white/40" />
                        </a>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
