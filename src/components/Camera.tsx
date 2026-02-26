import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { Camera as CameraIcon, AlertCircle, RefreshCw } from 'lucide-react';

export interface CameraRef {
  captureFrame: () => string | null;
}

export const Camera = forwardRef<CameraRef>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current) return null;
      
      const width = videoRef.current.videoWidth || 640;
      const height = videoRef.current.videoHeight || 480;
      
      if (width === 0 || height === 0) return null;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        return dataUrl.split(',')[1];
      } catch (e) {
        console.error("Canvas capture failed", e);
        return null;
      }
    }
  }));

  const setupCamera = async (mounted: boolean) => {
    setIsLoading(true);
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (mounted) {
        setError("Camera API is not supported in this browser.");
        setIsLoading(false);
      }
      return null;
    }

    let stream: MediaStream | null = null;

    try {
      // Try environment camera first with more flexible constraints
      stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
    } catch (err) {
      console.warn("Environment camera failed, trying any camera:", err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (fallbackErr) {
        console.error("All camera attempts failed:", fallbackErr);
        if (mounted) {
          setError("Camera access denied. Please check your browser settings and permissions.");
          setIsLoading(false);
        }
        return null;
      }
    }

    if (videoRef.current && mounted && stream) {
      videoRef.current.srcObject = stream;
      
      // Some browsers need explicit play() call
      try {
        await videoRef.current.play();
        if (mounted) setIsLoading(false);
      } catch (e) {
        console.error("Auto-play failed:", e);
        // If auto-play fails, we might need a user gesture, but muted should work
        // We'll let onCanPlay handle it as a fallback
      }
    }

    return stream;
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let mounted = true;
    let timeoutId: any = null;
    
    const init = async () => {
      stream = await setupCamera(mounted);
      
      // Set a timeout to show an error if it's still loading after 10 seconds
      timeoutId = setTimeout(() => {
        if (mounted && isLoading && !error) {
          setError("Camera initialization is taking longer than expected. Please try refreshing or checking your permissions.");
          setIsLoading(false);
        }
      }, 10000);
    };

    init();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <>
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10">
          <CameraIcon size={48} className="text-white/20 animate-pulse mb-4" />
          <p className="text-white/50 text-center px-4">Connecting to camera...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 p-6">
          <AlertCircle size={48} className="text-red-500/50 mb-4" />
          <p className="text-white/80 text-center mb-2 font-medium">{error}</p>
          <p className="text-white/40 text-center text-sm mb-6">
            Mobile devices often require HTTPS and explicit permission. If you're using a private browser, camera access may be restricted.
          </p>
          <button 
            onClick={handleRetry}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full transition-colors border border-white/10"
          >
            <RefreshCw size={20} />
            Retry Camera
          </button>
        </div>
      )}
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onCanPlay={() => setIsLoading(false)}
        className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-700 ${isLoading || error ? 'opacity-0' : 'opacity-100'}`}
      />
    </>
  );
});
