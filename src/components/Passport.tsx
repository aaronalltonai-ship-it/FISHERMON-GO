import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, Globe2, Search, Crosshair } from 'lucide-react';
import { PassportDestination } from '../types';

interface Props {
  current: PassportDestination | null;
  onSelect: (destination: PassportDestination) => void;
  onClear: () => void;
  onClose: () => void;
}

const PRESETS: PassportDestination[] = [
  { label: 'Tokyo, Japan', lat: 35.6895, lng: 139.6917 },
  { label: 'Paris, France', lat: 48.8566, lng: 2.3522 },
  { label: 'Nairobi, Kenya', lat: -1.2921, lng: 36.8219 },
  { label: 'Rio de Janeiro, Brazil', lat: -22.9068, lng: -43.1729 },
  { label: 'Anchorage, Alaska', lat: 61.2181, lng: -149.9003 },
  { label: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
];

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export function Passport({ current, onSelect, onClear, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canClear = Boolean(current);

  const filteredPresets = useMemo(() => {
    if (!query.trim()) return PRESETS;
    const q = query.toLowerCase();
    return PRESETS.filter(p => p.label.toLowerCase().includes(q));
  }, [query]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Search failed');
      }
      const data = (await res.json()) as SearchResult[];
      setResults(data);
      if (data.length === 0) {
        setError('No results found. Try another place.');
      }
    } catch (err) {
      setError('Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (label: string, lat: number, lng: number) => {
    onSelect({ label, lat, lng });
    onClose();
  };

  const handleUseCurrent = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSelect('Current Location', pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLoading(false);
        setError('Location access denied.');
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-[#050a14] flex flex-col"
    >
      <div className="p-4 flex justify-between items-center border-b border-white/10 glass-panel">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 title-font">
          <Globe2 size={24} className="text-cyan-300" />
          Passport Travel
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="glass-panel rounded-2xl p-4 space-y-3">
          <p className="text-white/70 text-sm">
            Choose any destination and explore fishing spots without leaving your house.
          </p>
          {current && (
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 text-white/80 text-sm">
              <span>Active: {current.label}</span>
              {canClear && (
                <button
                  onClick={() => {
                    onClear();
                    onClose();
                  }}
                  className="text-amber-200 font-semibold"
                >
                  Return Home
                </button>
              )}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-4 space-y-3">
          <label className="text-white/50 text-xs uppercase font-bold tracking-wider">Search</label>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="City, landmark, or lake"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white/90 placeholder:text-white/40"
            />
            <button
              onClick={handleSearch}
              className="hud-button px-3 flex items-center gap-2"
            >
              <Search size={16} />
              {loading ? 'Searching' : 'Go'}
            </button>
          </div>
          {error && <p className="text-red-300 text-xs">{error}</p>}
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, idx) => (
                <button
                  key={`${result.lat}-${result.lon}-${idx}`}
                  onClick={() =>
                    handleSelect(
                      result.display_name,
                      parseFloat(result.lat),
                      parseFloat(result.lon)
                    )
                  }
                  className="w-full text-left glass-panel rounded-xl px-3 py-2 hover:bg-white/10 transition-colors"
                >
                  <p className="text-white/90 text-sm">{result.display_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-4 space-y-3">
          <label className="text-white/50 text-xs uppercase font-bold tracking-wider">Quick Destinations</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredPresets.map(preset => (
              <button
                key={preset.label}
                onClick={() => handleSelect(preset.label, preset.lat, preset.lng)}
                className="glass-panel rounded-xl px-3 py-2 hover:bg-white/10 transition-colors text-left"
              >
                <p className="text-white text-sm font-semibold">{preset.label}</p>
                <p className="text-white/50 text-xs">
                  {preset.lat.toFixed(2)}, {preset.lng.toFixed(2)}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <button
            onClick={handleUseCurrent}
            className="w-full hud-button py-3 flex items-center justify-center gap-2"
          >
            <Crosshair size={18} />
            Use Current Location
          </button>
        </div>
      </div>
    </motion.div>
  );
}
