import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  RefreshCw,
  AlertTriangle,
  Flashlight,
  CheckCircle2,
  Image,
  ClipboardPaste,
  Info,
  Loader2,
} from 'lucide-react';
import { decompressNetworkData, parseScannedFrame, COMPRESSED_PREFIX } from '../utils/syncCodec';
import { NetworkGraphData } from '../types';

interface InAppQRScannerProps {
  onScanSuccess: (data: NetworkGraphData, source: string) => void;
  onClose: () => void;
  isPaused?: boolean;
}

export const InAppQRScanner: React.FC<InAppQRScannerProps> = ({
  onScanSuccess,
  onClose,
  isPaused = false,
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
  const [isDecodingPhoto, setIsDecodingPhoto] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const isProcessingFrameRef = useRef(false);
  const barcodeDetectorRef = useRef<any>(null);
  const scanIterationRef = useRef(0);
  const collectedChunksRef = useRef<Map<number, string>>(new Map());

  // Initialize BarcodeDetector once if supported natively by browser/system
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (_) {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  // Initialize Camera Stream with Continuous Autofocus
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
      setIsScanning(true);

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
        setErrorMessage('相機權限已被拒絕。請在手機設定中允許瀏覽器存取相機，或改用下方「讀取剪貼簿」秒速同步。');
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

  // Start Camera on mount or mode change
  useEffect(() => {
    if (!isPaused) {
      startCamera(facingMode);
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera, facingMode, isPaused]);

  // High-Speed Throttled QR Scan Loop (Runs every 70ms with multi-sampling)
  useEffect(() => {
    if (!isScanning || isPaused) return;

    const performScan = async () => {
      if (isProcessingFrameRef.current) return;
      isProcessingFrameRef.current = true;
      scanIterationRef.current += 1;

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

        // Method 1: Hardware-accelerated BarcodeDetector (Full frame, fast)
        if (barcodeDetectorRef.current) {
          try {
            const barcodes = await barcodeDetectorRef.current.detect(video);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              detectedRaw = barcodes[0].rawValue;
            }
          } catch (_) {}
        }

        // Method 2: jsQR fallback
        if (!detectedRaw) {
          const isWideScan = scanIterationRef.current % 3 === 0;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            if (isWideScan) {
              // Full frame scaled to 640px wide for wide-angle scanning
              const targetW = 640;
              const targetH = Math.round((vh / vw) * 640);
              canvas.width = targetW;
              canvas.height = targetH;
              ctx.drawImage(video, 0, 0, targetW, targetH);
              const imageData = ctx.getImageData(0, 0, targetW, targetH);
              const code = jsQR(imageData.data, targetW, targetH, {
                inversionAttempts: scanIterationRef.current % 6 === 0 ? 'attemptBoth' : 'dontInvert',
              });
              if (code && code.data) {
                detectedRaw = code.data;
              }
            } else {
              // Center-square crop at 520px (Crisp focus for monitor QR codes)
              const cropSize = Math.min(vw, vh) * 0.85;
              const sx = (vw - cropSize) / 2;
              const sy = (vh - cropSize) / 2;
              const targetDim = 520;
              canvas.width = targetDim;
              canvas.height = targetDim;

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
        }

        // Handle Detection Result
        if (detectedRaw) {
          // Check if this is a chunked/paginated QR code frame (e.g. NNZ:F1/3:...)
          const frameInfo = parseScannedFrame(detectedRaw);
          if (frameInfo) {
            collectedChunksRef.current.set(frameInfo.index, frameInfo.chunk);
            const collected = collectedChunksRef.current.size;
            const total = frameInfo.total;

            if (collected < total) {
              setScanFeedback({
                type: 'detecting',
                message: `分段接收中：已收集 ${collected} / ${total} 片段 (${Math.round((collected / total) * 100)}%)，請對準下一張條碼...`,
              });
              if (typeof navigator.vibrate === 'function') {
                navigator.vibrate(35);
              }
              isProcessingFrameRef.current = false;
              return;
            } else {
              // All fragments gathered! Assemble in order
              let fullTokenPart = '';
              for (let i = 1; i <= total; i++) {
                fullTokenPart += collectedChunksRef.current.get(i) || '';
              }
              detectedRaw = `${COMPRESSED_PREFIX}${fullTokenPart}`;
              collectedChunksRef.current.clear();
            }
          }

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
            if (videoRef.current) {
              videoRef.current.pause();
            }
            onScanSuccess(graphData, 'camera');
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

    scanIntervalRef.current = window.setInterval(performScan, 70);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning, isPaused, onScanSuccess]);

  // Decode still photo uploaded from camera roll (Handles large 12MP-48MP photos with multi-scale downscaling)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingPhoto(true);
    setScanFeedback({ type: 'detecting', message: '正在全力辨識選取的相片條碼...' });
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setIsDecodingPhoto(false);
        setErrorMessage('無法讀取相片內容');
        return;
      }

      const img = new window.Image();
      img.onload = async () => {
        try {
          let detectedRaw: string | null = null;

          // Strategy 1: Hardware BarcodeDetector
          if (barcodeDetectorRef.current) {
            try {
              const barcodes = await barcodeDetectorRef.current.detect(img);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                detectedRaw = barcodes[0].rawValue;
              }
            } catch (err) {
              console.warn('BarcodeDetector on image failed, trying multi-scale jsQR:', err);
            }
          }

          // Strategy 2: Multi-scale jsQR (Downscale large phone photos to 1200px, 800px, 600px)
          if (!detectedRaw) {
            const testScales = [1200, 800, 600];
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            for (const maxDim of testScales) {
              if (detectedRaw) break;
              const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
              const w = Math.round(img.width * scale);
              const h = Math.round(img.height * scale);
              canvas.width = w;
              canvas.height = h;

              if (ctx) {
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                const imageData = ctx.getImageData(0, 0, w, h);
                const code = jsQR(imageData.data, w, h, {
                  inversionAttempts: 'attemptBoth',
                });
                if (code && code.data) {
                  detectedRaw = code.data;
                  break;
                }
              }
            }
          }

          // Strategy 3: Center square crop test
          if (!detectedRaw) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const cropW = Math.round(img.width * 0.7);
            const cropH = Math.round(img.height * 0.7);
            const cropX = Math.round((img.width - cropW) / 2);
            const cropY = Math.round((img.height - cropH) / 2);
            const targetDim = 600;
            canvas.width = targetDim;
            canvas.height = targetDim;

            if (ctx) {
              ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetDim, targetDim);
              const imageData = ctx.getImageData(0, 0, targetDim, targetDim);
              const code = jsQR(imageData.data, targetDim, targetDim, {
                inversionAttempts: 'attemptBoth',
              });
              if (code && code.data) {
                detectedRaw = code.data;
              }
            }
          }

          if (detectedRaw) {
            try {
              const parsed = decompressNetworkData(detectedRaw);
              setScanFeedback({ type: 'success', message: `相片辨識成功！載入 ${parsed.members.length} 位成員...` });
              if (typeof navigator.vibrate === 'function') {
                navigator.vibrate([60, 40, 60]);
              }
              setIsScanning(false);
              if (videoRef.current) {
                videoRef.current.pause();
              }
              onScanSuccess(parsed, 'photo');
            } catch (err: any) {
              setErrorMessage(`照片內的條碼解析失敗：${err.message || '格式不符'}`);
            }
          } else {
            setErrorMessage('在選取的照片中未發現清晰的 QR Code。建議拍照時將條碼置中並避開反光。');
          }
        } catch (err: any) {
          setErrorMessage(`照片辨識發生錯誤：${err.message}`);
        } finally {
          setIsDecodingPhoto(false);
        }
      };

      img.onerror = () => {
        setIsDecodingPhoto(false);
        setErrorMessage('照片載入失敗，請確認檔案格式是否支援。');
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      setIsDecodingPhoto(false);
      setErrorMessage('讀取相片時發生錯誤。');
    };

    // CRITICAL: Must be readAsDataURL for image processing
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Instant Paste from Clipboard Handler
  const handlePasteFromClipboard = async () => {
    try {
      setErrorMessage(null);
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setErrorMessage('剪貼簿目前沒有內容，請先在發送端點擊「複製代碼」或「複製連結」！');
        return;
      }
      const clean = text.trim();
      const parsed = decompressNetworkData(clean);
      setScanFeedback({ type: 'success', message: `剪貼簿讀取成功！已解析 ${parsed.members.length} 位成員` });
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(60);
      }
      setIsScanning(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      onScanSuccess(parsed, 'clipboard');
    } catch (err: any) {
      setErrorMessage(`無法解析剪貼簿內容：${err.message || '請確認複製的是有效的同步代碼或連結'}`);
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

        {/* Focus Guide Overlay with High-Tech Laser Beam Scanning Up and Down */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-sky-400/90 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* 4 Corner Targeting Marks */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl-xl" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr-xl" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl-xl" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br-xl" />

            {/* HIGH-TECH CONTINUOUS UP-DOWN LASER SCANNING BEAM */}
            {isScanning && !isPaused && (
              <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee,0_0_6px_#ffffff] rounded-full pointer-events-none animate-laser z-10" />
            )}

            {/* Center Aiming Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
              <div className="w-10 h-10 border border-dashed border-sky-400 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Control Overlay */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
          <div className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 text-sky-300 text-xs font-semibold flex items-center gap-1.5 shadow-md">
            <Camera className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>上下雷射對焦辨識中</span>
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

        {/* Digital Zoom Controls */}
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

        {/* Photo Decoding Spinner Overlay */}
        {isDecodingPhoto && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center z-25 text-white space-y-2">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            <div className="text-xs font-bold text-slate-200">正在解析相片條碼...</div>
          </div>
        )}

        {/* Live Detection Feedback Bar */}
        {scanFeedback && (
          <div
            className={`absolute bottom-12 inset-x-4 z-20 p-2.5 rounded-xl backdrop-blur-md text-xs font-medium border flex items-center justify-center gap-2 animate-in fade-in duration-150 ${
              scanFeedback.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-950'
                : 'bg-amber-950/90 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-950'
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
            <div className="text-sm font-bold text-slate-100">掃描提示</div>
            <p className="text-xs text-slate-300 max-w-xs leading-relaxed">{errorMessage}</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setErrorMessage(null);
                  startCamera(facingMode);
                }}
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

      {/* Action Bar (Direct Clipboard & Photo Upload) */}
      <div className="w-full max-w-sm flex items-center gap-2 pt-1">
        {/* Instant Paste from Clipboard button */}
        <button
          onClick={handlePasteFromClipboard}
          className="flex-1 py-2.5 px-3 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md shadow-emerald-950/50"
          title="直接讀取剪貼簿內的代碼或連結並立即確認"
        >
          <ClipboardPaste className="w-4 h-4 text-emerald-400" />
          <span>讀取剪貼簿秒速導入</span>
        </button>

        {/* Upload Screenshot / Photo button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
          title="從相簿中選擇包含 QR Code 的照片"
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
          <span>掃描小撇步：</span>
        </div>
        <p className="leading-relaxed">
          1. 保持手機與電腦螢幕距離約 <strong className="text-white">30～45 公分</strong>（避免靠太近而失焦）。
          <br />
          2. 如螢幕較遠，可點選取景框下方的 <strong className="text-white">1.5x / 2x 變焦</strong>。
          <br />
          3. 若反光嚴重，建議在電腦端將條碼放大，或由手機端直接點擊「<strong>讀取剪貼簿</strong>」。
        </p>
      </div>
    </div>
  );
};
