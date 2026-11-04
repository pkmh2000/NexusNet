import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  RefreshCw,
  X,
  AlertTriangle,
  Flashlight,
  CheckCircle2,
  ZoomIn,
  Image,
  ClipboardPaste,
  Sparkles,
  Info,
} from 'lucide-react';
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
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [supportedZoomRange, setSupportedZoomRange] = useState<{ min: number; max: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(1);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'warn' | 'detecting'; message: string } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const isProcessingFrameRef = useRef(false);
  const barcodeDetectorRef = useRef<any>(null);

  // Initialize BarcodeDetector once if supported
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (_) {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  // Initialize Camera Stream with Continuous Autofocus & High Framerate
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      setErrorMessage(null);
      setScanFeedback(null);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          advanced: [
            { focusMode: 'continuous' } as any,
            { exposureMode: 'continuous' } as any,
          ],
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setHasPermission(true);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        setHasTorch(!!capabilities.torch);

        if (capabilities.zoom) {
          setSupportedZoomRange({ min: capabilities.zoom.min || 1, max: capabilities.zoom.max || 3 });
        } else {
          setSupportedZoomRange(null);
        }
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('相機權限已被拒絕。請在手機設定中允許相機存取，或改用下方「讀取剪貼簿」直接同步。');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('未偵測到相機鏡頭設備。');
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

  const applyDigitalZoom = useCallback(async (zoomValue: number) => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && supportedZoomRange) {
      try {
        const target = Math.min(supportedZoomRange.max, Math.max(supportedZoomRange.min, zoomValue));
        await (track as any).applyConstraints({
          advanced: [{ zoom: target }],
        });
        setCurrentZoom(target);
      } catch (err) {
        console.warn('Failed to apply zoom:', err);
      }
    }
  }, [supportedZoomRange]);

  // Start Camera
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera, facingMode]);

  // High-Speed Throttled QR Scan Loop (Runs every 70ms on downscaled center crop for instant detection)
  useEffect(() => {
    if (!isScanning) return;

    const performScan = async () => {
      if (isProcessingFrameRef.current) return;
      isProcessingFrameRef.current = true;

      const video = videoRef.current;
      const canvas = scanCanvasRef.current;

      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !canvas) {
        isProcessingFrameRef.current = false;
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw <= 0 || vh <= 0) {
        isProcessingFrameRef.current = false;
        return;
      }

      try {
        let detectedRaw: string | null = null;

        // Method 1: Hardware-accelerated BarcodeDetector (Direct from video element)
        if (barcodeDetectorRef.current) {
          try {
            const barcodes = await barcodeDetectorRef.current.detect(video);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              detectedRaw = barcodes[0].rawValue;
            }
          } catch (_) {}
        }

        // Method 2: High-speed jsQR fallback on downscaled center-crop canvas
        if (!detectedRaw) {
          // Downscale to 480x480 center-square crop (Ultra-fast, runs in ~4ms!)
          const cropSize = Math.min(vw, vh);
          const sx = (vw - cropSize) / 2;
          const sy = (vh - cropSize) / 2;
          const targetDim = 480;

          canvas.width = targetDim;
          canvas.height = targetDim;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, targetDim, targetDim);
            const imageData = ctx.getImageData(0, 0, targetDim, targetDim);
            const code = jsQR(imageData.data, targetDim, targetDim, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data) {
              detectedRaw = code.data;
            }
          }
        }

        // Handle Detection Result
        if (detectedRaw) {
          try {
            const graphData = decompressNetworkData(detectedRaw);
            setScanFeedback({
              type: 'success',
              message: `辨識成功！載入 ${graphData.members.length} 位成員...`,
            });
            if (typeof navigator.vibrate === 'function') {
              navigator.vibrate([60, 40, 60]);
            }
            setIsScanning(false);
            setTimeout(() => {
              onScanSuccess(graphData, detectedRaw);
            }, 300);
            return;
          } catch (err: any) {
            setScanFeedback({
              type: 'warn',
              message: '已偵測到條碼，但非 NexusNet 圖譜資料格式。請對準螢幕上的同步條碼。',
            });
          }
        }
      } catch (_) {
      } finally {
        isProcessingFrameRef.current = false;
      }
    };

    scanIntervalRef.current = window.setInterval(performScan, 75);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning, onScanSuccess]);

  // Decode still photo uploaded from camera roll
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, img.width, img.height);

        if (code && code.data) {
          try {
            const parsed = decompressNetworkData(code.data);
            setScanFeedback({ type: 'success', message: '照片辨識成功！' });
            onScanSuccess(parsed, code.data);
          } catch (err: any) {
            setErrorMessage(`照片內的條碼解析失敗：${err.message}`);
          }
        } else {
          setErrorMessage('在選取的照片中未發現清晰的 QR Code，請確認圖片清晰未模糊。');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Instant Paste from Clipboard Handler
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setErrorMessage('剪貼簿目前沒有內容，請先複製同步代碼或連結！');
        return;
      }
      const parsed = decompressNetworkData(text.trim());
      setScanFeedback({ type: 'success', message: '剪貼簿讀取成功！立即導入圖譜...' });
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(60);
      }
      setTimeout(() => {
        onScanSuccess(parsed, text.trim());
      }, 200);
    } catch (err: any) {
      setErrorMessage(`無法讀取剪貼簿：${err.message || '請手動至「代碼/連結」頁籤貼上'}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-3 text-center space-y-3">
      {/* Viewfinder Frame */}
      <div className="relative w-full max-w-sm aspect-square bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border-2 border-sky-500/50 flex items-center justify-center">
        {/* Offscreen downscaled canvas for jsQR frame sampling */}
        <canvas ref={scanCanvasRef} className="hidden" />

        {/* Video Camera Feed */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Focus Guide Overlay (Bigger square, responsive crosshairs) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-sky-400/90 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex flex-col justify-between p-3 animate-pulse">
            {/* 4 Corner Targeting Marks */}
            <div className="flex justify-between">
              <span className="w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl-xl" />
              <span className="w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr-xl" />
            </div>

            {/* Laser scanning beam */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_#38bdf8] rounded-full animate-bounce" />

            <div className="flex justify-between">
              <span className="w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl-xl" />
              <span className="w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br-xl" />
            </div>
          </div>
        </div>

        {/* Top Control Overlay */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
          <div className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 text-sky-300 text-xs font-semibold flex items-center gap-1.5 shadow-md">
            <Camera className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>超速鏡頭辨識中</span>
          </div>

          <div className="flex items-center gap-1.5">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-2 rounded-xl backdrop-blur-md border transition ${
                  torchOn
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-950/70 text-white border-white/20'
                }`}
                title="開關補光燈"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={switchCamera}
              className="p-2 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/20 text-white hover:bg-slate-900 transition"
              title="切換鏡頭"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Digital Zoom Controls (Helps user scan without pushing phone dangerously close) */}
        {supportedZoomRange && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 shadow-lg">
            <button
              onClick={() => applyDigitalZoom(1)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                currentZoom <= 1.1 ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              1x
            </button>
            <button
              onClick={() => applyDigitalZoom(1.5)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                currentZoom > 1.1 && currentZoom < 1.9 ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              1.5x
            </button>
            <button
              onClick={() => applyDigitalZoom(2)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                currentZoom >= 1.9 ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              2x
            </button>
          </div>
        )}

        {/* Live Detection Feedback Bar */}
        {scanFeedback && (
          <div
            className={`absolute bottom-12 inset-x-4 z-20 p-2.5 rounded-xl backdrop-blur-md text-xs font-medium border flex items-center justify-center gap-2 animate-in fade-in duration-150 ${
              scanFeedback.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/90 border-amber-500/50 text-amber-300'
            }`}
          >
            {scanFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{scanFeedback.message}</span>
          </div>
        )}

        {/* Error / Permission Blocked Message */}
        {errorMessage && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center z-30 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-100">掃描相機提示</div>
            <p className="text-xs text-slate-300 max-w-xs leading-relaxed">{errorMessage}</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition"
              >
                重試相機
              </button>
              <button
                onClick={handlePasteFromClipboard}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
              >
                讀取剪貼簿
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Troubleshooting & Alternative Action Bar */}
      <div className="w-full max-w-sm flex items-center gap-2 pt-1">
        {/* Instant Paste from Clipboard button */}
        <button
          onClick={handlePasteFromClipboard}
          className="flex-1 py-2.5 px-3 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
          title="直接讀取剪貼簿內的代碼或連結"
        >
          <ClipboardPaste className="w-4 h-4" />
          <span>讀取剪貼簿秒速導入</span>
        </button>

        {/* Upload Screenshot / Photo button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
          title="從相簿中選擇 QR Code 截圖"
        >
          <Image className="w-4 h-4 text-sky-400" />
          <span>選相片辨識</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>

      {/* Helpful Distance & Focus Tips */}
      <div className="max-w-sm bg-slate-950/60 border border-slate-800/80 rounded-2xl p-2.5 text-left text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-sky-300 font-semibold">
          <Info className="w-3.5 h-3.5 text-sky-400" />
          <span>掃描小撇步（對焦與距離）：</span>
        </div>
        <p className="leading-relaxed">
          1. 保持手機與電腦螢幕距離約 <strong className="text-white">30～45 公分</strong>（太近鏡頭反而會模糊失焦）。
          <br />
          2. 如畫面較小，請點擊取景框下方的 <strong className="text-white">1.5x / 2x 變焦</strong>，無需把手機貼近螢幕！
          <br />
          3. 若電腦螢幕會反光，請在電腦端點擊「<strong>放大條碼</strong>」或將手機稍微傾斜角度避開螢幕眩光。
        </p>
      </div>
    </div>
  );
};
