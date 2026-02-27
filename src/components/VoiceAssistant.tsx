import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MessageSquare, X, Loader2, Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceAssistant({ isOpen, onClose }: Props) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful fishing guide in an AR fishing game. Help the player with tips, fish facts, and game mechanics. Keep responses concise and friendly.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            startMic();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              const audioPart = message.serverContent.modelTurn.parts.find(p => p.inlineData);
              if (audioPart?.inlineData?.data) {
                playOutputAudio(audioPart.inlineData.data);
              }
              
              const textPart = message.serverContent.modelTurn.parts.find(p => p.text);
              if (textPart?.text) {
                setResponse(prev => prev + textPart.text);
              }
            }
            
            if (message.serverContent?.interrupted) {
              stopOutputAudio();
            }
          },
          onclose: () => {
            setIsActive(false);
            stopMic();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setIsConnecting(false);
          }
        }
      });
      
      sessionRef.current = session;
    } catch (err) {
      console.error("Failed to connect to Live API:", err);
      setIsConnecting(false);
    }
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        sessionRef.current.sendRealtimeInput({
          media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      console.error("Failed to start microphone:", err);
    }
  };

  const stopMic = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
  };

  const playOutputAudio = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    const blob = new Blob([bytes], { type: 'audio/pcm' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  };

  const stopOutputAudio = () => {
    // Implementation for stopping current playback if interrupted
  };

  const closeSession = () => {
    sessionRef.current?.close();
    onClose();
  };

  useEffect(() => {
    if (isOpen && !sessionRef.current) {
      startSession();
    }
    return () => {
      sessionRef.current?.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 right-4 left-4 z-[110] bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isActive ? 'bg-blue-500 animate-pulse' : 'bg-zinc-800'}`}>
            <Mic size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-tight">Fishing Guide</h3>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Powered by Gemini Live</p>
          </div>
        </div>
        <button onClick={closeSession} className="p-2 text-white/40 hover:text-white bg-white/5 rounded-full">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {isConnecting ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="animate-spin text-blue-400 mb-4" size={32} />
            <p className="text-white/60 text-sm italic">Connecting to guide...</p>
          </div>
        ) : (
          <div className="min-h-[100px] flex flex-col justify-center">
            {response ? (
              <p className="text-white text-lg font-medium leading-tight">{response}</p>
            ) : (
              <p className="text-white/30 text-center italic">Speak to your guide...</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <div className="flex items-center gap-2">
          {isActive && (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <motion.div
                  key={i}
                  animate={{ height: [8, 24, 8] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                  className="w-1 bg-blue-400 rounded-full"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
