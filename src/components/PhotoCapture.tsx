import { useRef, useState, useEffect, useCallback } from 'react';

interface PhotoCaptureProps {
  onCapture: (base64: string) => void;
  onSkip: () => void;
  title?: string;
  subtitle?: string;
}

export function PhotoCapture({ onCapture, onSkip, title, subtitle }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [captured, setCaptured] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera permissions in your browser.');
      } else if (err?.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera: ' + (err?.message || 'unknown error'));
      }
    }
  };

  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the image (selfie view)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    setCaptured(base64);
  }, []);

  const confirm = () => {
    if (captured) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      onCapture(captured);
    }
  };

  const retake = () => {
    setCaptured(null);
    setCameraReady(false);
    startCamera();
  };

  const skip = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onSkip();
  };

  // Camera error state
  if (cameraError) {
    return (
      <div className="text-center py-6 space-y-4">
        <span className="text-5xl">📷</span>
        <p className="text-red-600 font-medium">{cameraError}</p>
        <p className="text-sm text-gray-500">You can skip photo capture and continue.</p>
        <button className="btn-primary" onClick={skip}>
          Skip & Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}

      {/* Preview / Captured image */}
      {captured ? (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border-2 border-green-400 shadow-lg">
            <img src={captured} alt="Captured" className="w-full max-h-80 object-cover" />
          </div>
          <p className="text-center text-green-600 font-medium text-sm">
            ✅ Photo captured. Does it look good?
          </p>
          <div className="flex gap-3 justify-center">
            <button className="btn-primary" onClick={confirm}>
              ✓ Use This Photo
            </button>
            <button className="btn-secondary" onClick={retake}>
              🔄 Retake
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Live camera */}
          <div className="relative bg-black rounded-xl overflow-hidden shadow-lg" style={{ maxHeight: 400 }}>
            <video
              ref={videoRef}
              className="w-full object-cover"
              style={{ transform: 'scaleX(-1)', maxHeight: 400 }}
              muted
              playsInline
            />
            {!cameraReady && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-2" />
                  <p>Starting camera...</p>
                </div>
              </div>
            )}
            {/* Guide overlay */}
            {cameraReady && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="border-2 border-dashed border-white/60 rounded-full w-48 h-48" />
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-500">
            Position your face inside the circle and take a clear photo.
          </p>

          <div className="flex gap-3 justify-center">
            <button className="btn-primary" onClick={takeSnapshot} disabled={!cameraReady}>
              📸 Take Photo
            </button>
            <button className="btn-secondary" onClick={skip}>
              Skip
            </button>
          </div>
        </>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
