import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { generateSpeech } from '../lib/gemini';

interface Props {
  gameState: string;
  locationType: 'urban' | 'rural';
  isMonster: boolean;
}

const STATIC_TRACKS = {
  urban: 'https://cdn.pixabay.com/audio/2022/10/14/audio_99397d64d7.mp3',
  rural: 'https://cdn.pixabay.com/audio/2022/01/26/audio_d0c6ff1101.mp3',
  suspense: 'https://cdn.pixabay.com/audio/2022/02/07/audio_64b61af4c1.mp3',
  monster: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73456.mp3',
  sad: 'https://cdn.pixabay.com/audio/2022/03/24/audio_b3b2a02457.mp3',
  victory: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bbdec67d50.mp3'
};

export function MusicManager({ gameState, locationType, isMonster }: Props) {
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<string>(STATIC_TRACKS.rural);
  const [isGenerating, setIsGenerating] = useState(false);
  const [presets, setPresets] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('audio_presets');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const generateAmbient = async (key: string, prompt: string) => {
      if (presets[key]) {
        setCurrentTrack(presets[key]);
        return;
      }

      setIsGenerating(true);
      try {
        const audio = await generateSpeech(prompt, 'Zephyr');
        if (audio) {
          const newPresets = { ...presets, [key]: audio };
          setPresets(newPresets);
          localStorage.setItem('audio_presets', JSON.stringify(newPresets));
          setCurrentTrack(audio);
        }
      } catch (err) {
        console.error("Failed to generate ambient audio:", err);
      } finally {
        setIsGenerating(false);
      }
    };

    let nextTrackKey: string = locationType;
    let prompt = locationType === 'urban' 
      ? "Atmospheric urban sounds, distant traffic, city hum, lo-fi beats." 
      : "Peaceful rural sounds, birds chirping, gentle wind, acoustic guitar strums.";

    if (gameState === 'BITING' || gameState === 'REELING') {
      nextTrackKey = isMonster ? 'monster' : 'suspense';
      prompt = isMonster 
        ? "Intense, heavy, aggressive orchestral music with deep drums and terrifying roars."
        : "Tense, suspenseful music with fast-paced strings and a heartbeat rhythm.";
    } else if (gameState === 'BROKEN' || gameState === 'ESCAPED') {
      nextTrackKey = 'sad';
      prompt = "Melancholic, sad piano melody with a sense of disappointment.";
    } else if (gameState === 'CAUGHT') {
      nextTrackKey = 'victory';
      prompt = "Triumphant, upbeat victory fanfare with trumpets and cheering.";
    }

    // Try to generate or use preset
    generateAmbient(nextTrackKey, prompt);
  }, [gameState, locationType, isMonster]);

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      // Only update src if it changed to avoid reloading same track
      const audio = audioRef.current;
      
      // Use a small delay to ensure the element is ready
      const timeout = setTimeout(() => {
        if (audio.src !== currentTrack) {
          audio.src = currentTrack;
          audio.load();
        }
        
        if (!isMuted) {
          audio.play().catch(e => {
            if (e.name !== 'NotAllowedError') {
              console.warn("Audio play failed:", e);
            }
          });
        } else {
          audio.pause();
        }
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [currentTrack, isMuted]);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  return (
    <div className="fixed bottom-32 left-4 z-[100] flex items-center gap-3">
      <button 
        onClick={toggleMute}
        className="bg-black/60 backdrop-blur-md p-3 rounded-full border border-white/10 text-white shadow-lg hover:bg-black/80 transition-all"
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} className="text-blue-400 animate-pulse" />}
      </button>
      
      {isGenerating && (
        <div className="bg-blue-600/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-400/30 flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
          <Sparkles size={14} className="text-white animate-spin" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Lyra Generating...</span>
        </div>
      )}

      <audio 
        ref={audioRef} 
        loop={gameState === 'MAP' || gameState === 'CAMERA' || gameState === 'WAITING'} 
        muted={isMuted}
        onError={(e) => {
          console.warn("Music track failed to load:", currentTrack);
        }}
      />
    </div>
  );
}
