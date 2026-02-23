import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { Camera as CameraIcon, AlertCircle } from 'lucide-react';

export interface CameraRef {
  captureFrame: () => string | null;
}

export const Camera = forwardRef<CameraRef>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current) return null;
      
      // Ensure we have valid dimensions
      const width = videoRef.current.videoWidth || 640;
      const height = videoRef.current.videoHeight || 480;
      
      if (width === 0 || height === 0) return null;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      return dataUrl.split(',')[1];
    }
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;
    let mounted = true;
    
    async function setupCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (mounted) {
          setError("Camera API is not supported in this browser.");
          setIsLoading(false);
        }
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current && mounted) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (e) {
            console.error("Play failed", e);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error accessing environment camera:", err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current && mounted) {
            videoRef.current.srcObject = stream;
            try {
              await videoRef.current.play();
            } catch (e) {
              console.error("Play failed", e);
            }
            setIsLoading(false);
          }
        } catch (fallbackErr) {
          console.error("Fallback camera error:", fallbackErr);
          if (mounted) {
            setError("Camera access denied. Please allow camera permissions.");
            setIsLoading(false);
          }
        }
      }
    }
    
    setupCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <>
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-0">
          <CameraIcon size={48} className="text-white/20 animate-pulse mb-4" />
          <p className="text-white/50 text-center px-4">Initializing camera...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-0">
          <AlertCircle size={48} className="text-red-500/50 mb-4" />
          <p className="text-white/80 text-center px-4 mb-2">{error}</p>
          <p className="text-white/40 text-center px-4 text-sm">
            Make sure you have granted camera permissions to this site.
          </p>
        </div>
      )}
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-500 ${isLoading || error ? 'opacity-0' : 'opacity-100'}`}
      />
    </>
  );
});
