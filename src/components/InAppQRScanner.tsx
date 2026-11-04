import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, X, AlertTriangle, Flashlight, CheckCircle2, Shield } from 'lucide-react';
import { decompressNetworkData } from '../utils/syncCodec';
import { NetworkGraphData } from '../types';

interface InAppQRScannerProps {
  onScanSuccess: (data: NetworkGraphData, rawToken: string) => void;
  onClose: () => void;
}

export const InAppQRScanner: React.FC<InAppQRScannerProps> = ({
  onScanSuccess,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Initialize Camera Stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      setErrorMessage(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        await videoRef.current.play();
      }

      setHasPermission(true);

      // Check for flashlight / torch support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        setHasTorch(!!capabilities.torch);
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('相機權限已被拒絕。請在裝置或瀏覽器設定中允許相機存取權限。');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('未偵測到可用的鏡頭設備。');
      } else {
        setErrorMessage(`無法啟動相機：${err.message || '未知錯誤'}`);
      }
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextTorch = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setTorchOn(nextTorch);
      } catch (err) {
        console.warn('Failed to toggle torch:', err);
      }
    }
  }, [hasTorch, torchOn]);

  const switchCamera = useCallback(() => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  }, [facingMode, startCamera]);

  // Frame Inspection Loop
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera, facingMode]);

  // Real-time Barcode / QR detection
  useEffect(() => {
    let active = true;

    const scanFrame = async () => {
      if (!active || !isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && canvas) {
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);

            let detectedRaw: string | null = null;

            // 1. Try Native BarcodeDetector if available (Ultra-fast hardware acceleration)
            if ('BarcodeDetector' in window) {
              try {
                const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                const barcodes = await detector.detect(canvas);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  detectedRaw = barcodes[0].rawValue;
                }
              } catch (_) {}
            }

            // 2. Fallback to jsQR (Works universally on all iOS / Android webviews & PWAs)
            if (!detectedRaw) {
              const imageData = ctx.getImageData(0, 0, width, height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });
              if (code && code.data) {
                detectedRaw = code.data;
              }
            }

            if (detectedRaw) {
              try {
                const graphData = decompressNetworkData(detectedRaw);
                // Vibrate feedback on supported devices
                if (typeof navigator.vibrate === 'function') {
                  navigator.vibrate([40, 30, 40]);
                }
                setIsScanning(false);
                onScanSuccess(graphData, detectedRaw);
                return;
              } catch (err: any) {
                // Not valid sync data, keep scanning
                console.debug('Scanned QR code but not NexusNet format:', err.message);
              }
            }
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      active = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isScanning, onScanSuccess]);

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 text-center space-y-3">
      {/* Viewfinder Container */}
      <div className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-sky-500/50 flex items-center justify-center">
        {/* Hidden processing canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Camera Stream */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Scanning Target Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
          <div className="relative w-64 h-64 border-2 border-sky-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex flex-col justify-between p-2">
            {/* Corner Markers */}
            <div className="flex justify-between">
              <span className="w-5 h-5 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
              <span className="w-5 h-5 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
            </div>

            {/* Laser scanning beam animation */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-bounce" />

            <div className="flex justify-between">
              <span className="w-5 h-5 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
              <span className="w-5 h-5 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />
            </div>
          </div>
        </div>

        {/* Floating Camera Controls inside viewport */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
          <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-sky-300 text-[11px] font-semibold flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>App 內建鏡頭掃描中</span>
          </div>

          <div className="flex items-center gap-1.5">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-2 rounded-xl backdrop-blur-md border transition ${
                  torchOn
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-black/60 text-white border-white/20'
                }`}
                title="開關補光燈"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={switchCamera}
              className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition"
              title="切換前後鏡頭"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error / Permission Blocked Banner */}
        {errorMessage && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center z-20 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-100">無法開啟相機</div>
            <p className="text-xs text-slate-400 max-w-xs">{errorMessage}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition"
            >
              重新嘗試授權
            </button>
          </div>
        )}
      </div>

      {/* Guide Note */}
      <div className="max-w-xs space-y-1">
        <p className="text-xs text-slate-300 font-medium">
          請將鏡頭對準電腦或另一台裝置上的 NexusNet 同步 QR Code
        </p>
        <p className="text-[11px] text-slate-400">
          辨識成功後將直接在 App 內自動導入，無需離開應用程式或打開瀏覽器。
        </p>
      </div>
    </div>
  );
};
