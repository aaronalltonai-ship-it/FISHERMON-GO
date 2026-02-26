import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface Props {
  gameState: string;
  locationType: 'urban' | 'rural';
  isMonster: boolean;
}

const TRACKS = {
  urban: 'https://cdn.pixabay.com/audio/2022/10/14/audio_99397d64d7.mp3', // Hip hop vibe
  rural: 'https://cdn.pixabay.com/audio/2022/01/26/audio_d0c6ff1101.mp3', // Acoustic/Country vibe
  suspense: 'https://cdn.pixabay.com/audio/2022/02/07/audio_64b61af4c1.mp3', // Tense
  monster: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73456.mp3', // Heavy/Aggressive
  sad: 'https://cdn.pixabay.com/audio/2022/03/24/audio_b3b2a02457.mp3', // Disappointment
  victory: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bbdec67d50.mp3' // Catch success
};

export function MusicManager({ gameState, locationType, isMonster }: Props) {
  const [isMuted, setIsMuted] = useState(true); // Default muted for auto-play policies
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<string>(TRACKS.rural);

  useEffect(() => {
    let nextTrack = locationType === 'urban' ? TRACKS.urban : TRACKS.rural;

    if (gameState === 'BITING' || gameState === 'REELING') {
      nextTrack = isMonster ? TRACKS.monster : TRACKS.suspense;
    } else if (gameState === 'BROKEN' || gameState === 'ESCAPED') {
      nextTrack = TRACKS.sad;
    } else if (gameState === 'CAUGHT') {
      nextTrack = TRACKS.victory;
    }

    if (nextTrack !== currentTrack) {
      setCurrentTrack(nextTrack);
    }
  }, [gameState, locationType, isMonster]);

  useEffect(() => {
    if (audioRef.current) {
      if (!isMuted) {
        audioRef.current.play().catch(e => console.log("Audio play blocked", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrack, isMuted]);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  return (
    <div className="fixed bottom-32 left-4 z-[100]">
      <button 
        onClick={toggleMute}
        className="bg-black/60 backdrop-blur-md p-3 rounded-full border border-white/10 text-white shadow-lg hover:bg-black/80 transition-all"
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} className="text-blue-400 animate-pulse" />}
      </button>
      {currentTrack && (
        <audio 
          ref={audioRef} 
          src={currentTrack}
          loop={gameState === 'MAP' || gameState === 'CAMERA' || gameState === 'WAITING'} 
          autoPlay={!isMuted}
          onError={(e) => console.error("Audio load error:", e)}
        />
      )}
    </div>
  );
}
