import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { NetworkGraphData } from '../types';
import { InAppQRScanner } from './InAppQRScanner';
import {
  compressNetworkData,
  compressLiteNetworkData,
  decompressNetworkData,
  splitTokenIntoFrames,
} from '../utils/syncCodec';
import { APP_VERSION, APP_BUILD_DATE, APP_CHANGELOG } from '../version';
import { useAppUpdate } from '../hooks/useAppUpdate';
import {
  X,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Download,
  Upload,
  ArrowRightLeft,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Camera,
  CheckCircle2,
  Rocket,
  RotateCcw,
  Maximize2,
  Zap,
  Info,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Layers,
} from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  network: NetworkGraphData;
  onImportData: (data: NetworkGraphData, mode: 'replace' | 'merge') => void;
  initialTab?: 'scan' | 'qr' | 'code' | 'file' | 'version';
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  network,
  onImportData,
  initialTab = 'scan',
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'qr' | 'code' | 'file' | 'version'>(initialTab);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [isAutoPlayChunks, setIsAutoPlayChunks] = useState(true);
  const [isEnlargedQr, setIsEnlargedQr] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('replace');
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    data: NetworkGraphData;
    source: 'camera' | 'photo' | 'clipboard' | 'code' | 'file';
  } | null>(null);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const enlargedQrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // App update manager
  const {
    currentVersion,
    remoteVersion,
    buildDate,
    isChecking,
    updateAvailable,
    statusMessage: updateStatusMessage,
    lastChecked,
    checkForUpdates,
    applyUpdate,
    forceBypassCacheReload,
  } = useAppUpdate();

  // Full compressed payload for JSON file backup
  const fullCompression = React.useMemo(() => {
    return compressNetworkData(network);
  }, [network]);

  // High-Efficiency Core Payload with 100% full custom fields & notes
  const liteCompression = React.useMemo(() => {
    return compressLiteNetworkData(network);
  }, [network]);

  // Check if data can safely fit into a single QR Code (safe threshold 1,800 chars)
  const canFitSingleQr = liteCompression.compressedToken.length <= 1800;

  // Density mode state: 'single' (單張極速碼) or 'chunks' (分段輪播大方塊)
  const [qrDensityMode, setQrDensityMode] = useState<'single' | 'chunks'>(() =>
    canFitSingleQr ? 'single' : 'chunks'
  );

  // Auto switch when data size changes
  useEffect(() => {
    if (!canFitSingleQr) {
      setQrDensityMode('chunks');
    }
  }, [canFitSingleQr]);

  // Multi-frame chunks for animated transmission (each chunk ~700 chars for optimal 3~6 frames with big chunky squares)
  const chunkFrames = React.useMemo(() => {
    return splitTokenIntoFrames(liteCompression.compressedToken, 700);
  }, [liteCompression.compressedToken]);

  // Auto carousel for chunked multi-frame mode (cycles every 1.5s)
  useEffect(() => {
    if (!isOpen || activeTab !== 'qr' || qrDensityMode !== 'chunks' || !isAutoPlayChunks || chunkFrames.length <= 1) {
      return;
    }
    const timer = setInterval(() => {
      setChunkIndex((prev) => (prev + 1) % chunkFrames.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [isOpen, activeTab, qrDensityMode, isAutoPlayChunks, chunkFrames.length]);

  // Active Token to render
  const activeToken = React.useMemo(() => {
    if (qrDensityMode === 'chunks') {
      return chunkFrames[chunkIndex % chunkFrames.length] || chunkFrames[0];
    }
    return liteCompression.compressedToken;
  }, [qrDensityMode, chunkFrames, chunkIndex, liteCompression.compressedToken]);

  const shareableUrl = `${window.location.origin}${window.location.pathname}#sync=${liteCompression.compressedToken}`;

  // Keep active tab in sync when initialTab changes
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Auto-fill from URL hash if opened with #sync=
  useEffect(() => {
    if (isOpen && window.location.hash.includes('#sync=')) {
      const hashToken = window.location.hash.split('#sync=')[1];
      if (hashToken) {
        setInputSyncCode(hashToken);
        setActiveTab('code');
      }
    }
  }, [isOpen]);

  // Render QR Code onto Canvas safely (Never leave a blank white canvas!)
  const renderQr = useCallback(
    (canvas: HTMLCanvasElement | null, width: number, tokenOverride?: string) => {
      if (!canvas) return;
      const targetToken = tokenOverride || activeToken;
      if (!targetToken) return;

      // If in single mode but data exceeds QR physical capacity, draw a clear friendly in-canvas notification
      if (qrDensityMode === 'single' && !canFitSingleQr) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = width;
          canvas.height = width;
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, width, width);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('人脈資料量豐富', width / 2, width / 2 - 20);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px sans-serif';
          ctx.fillText('單張條碼無法完整容納', width / 2, width / 2 + 5);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`請切換至「分段輪播」(${chunkFrames.length}片段秒掃)`, width / 2, width / 2 + 30);
        }
        return;
      }

      try {
        QRCode.toCanvas(
          canvas,
          targetToken,
          {
            width,
            margin: 2,
            errorCorrectionLevel: 'L', // Low error correction = biggest possible blocks for instant scanning
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          },
          (err) => {
            if (err) {
              console.warn('QR Code generation notice:', err);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.width = width;
                canvas.height = width;
                ctx.fillStyle = '#090d16';
                ctx.fillRect(0, 0, width, width);
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('條碼密度超出螢幕極限', width / 2, width / 2 - 10);
                ctx.fillStyle = '#38bdf8';
                ctx.font = '12px sans-serif';
                ctx.fillText('請使用「分段輪播」或「複製連結」', width / 2, width / 2 + 15);
              }
            }
          }
        );
      } catch (err) {
        console.error('QR render exception:', err);
      }
    },
    [activeToken, qrDensityMode, canFitSingleQr, chunkFrames.length]
  );

  // Render QR Code onto main canvas
  useEffect(() => {
    if (!isOpen || activeTab !== 'qr') return;
    renderQr(qrCanvasRef.current, 280);
  }, [isOpen, activeTab, activeToken, qrDensityMode, renderQr]);

  // Render QR Code onto enlarged canvas
  useEffect(() => {
    if (!isEnlargedQr) return;
    const timer = setTimeout(() => {
      renderQr(enlargedQrCanvasRef.current, Math.min(window.innerWidth - 60, 330));
    }, 40);
    return () => clearTimeout(timer);
  }, [isEnlargedQr, activeToken, renderQr]);

  if (!isOpen) return null;

  // In-App Scanner Success Handler (Directly opens confirmation prompt, NEVER silently navigates away!)
  const handleInAppScanSuccess = (scannedData: NetworkGraphData, source?: string) => {
    setPendingImport({
      data: scannedData,
      source: (source as any) || 'camera',
    });
    setIsError(false);
  };

  // Confirm and Apply Import Handler (Maximal sensory feedback: Confetti, vibration, instant graph render)
  const handleConfirmApplyImport = () => {
    if (!pendingImport) return;

    onImportData(pendingImport.data, importMode);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (_) {}

    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate([80, 50, 80]);
    }

    setSyncStatusMessage(
      importMode === 'replace'
        ? `🎉 同步成功！已完整覆蓋載入 ${pendingImport.data.members.length} 位成員與 ${pendingImport.data.relationships.length} 條關係線。`
        : `🎉 合併成功！已將最新資料合併至本機圖譜中。`
    );
    setIsError(false);
    setPendingImport(null);

    // Auto-close modal after brief celebratory moment so user sees updated canvas immediately!
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleCancelPendingImport = () => {
    setPendingImport(null);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(fullCompression.compressedToken);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = fullCompression.compressedToken;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = shareableUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleApplySyncCode = () => {
    if (!inputSyncCode.trim()) {
      setIsError(true);
      setSyncStatusMessage('請先貼上同步代碼或一鍵同步網址！');
      return;
    }

    try {
      const parsed = decompressNetworkData(inputSyncCode);
      setPendingImport({
        data: parsed,
        source: 'code',
      });
      setIsError(false);
      setInputSyncCode('');
    } catch (err: any) {
      setIsError(true);
      setSyncStatusMessage(`同步代碼解析失敗：${err.message || '格式錯誤'}`);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(fullCompression.rawJson);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `NexusNet_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = decompressNetworkData(content);
        setPendingImport({
          data: parsed,
          source: 'file',
        });
        setIsError(false);
      } catch (err: any) {
        setIsError(true);
        setSyncStatusMessage(`匯入失敗：${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>跨裝置同步與更新中心</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-400/30 font-semibold font-mono">
                  {currentVersion}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                超速鏡頭辨識 · 大方塊好對焦 · 剪貼簿一鍵導入
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/70 text-xs overflow-x-auto">
          {/* Tab 1: In-App Scanner */}
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 min-w-[95px] py-2.5 sm:py-3 font-semibold flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'scan'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>鏡頭掃碼導入</span>
          </button>

          {/* Tab 2: Show QR Code */}
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 min-w-[95px] py-2.5 sm:py-3 font-medium flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'qr'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>產生同步條碼</span>
          </button>

          {/* Tab 3: Code / Link */}
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 min-w-[95px] py-2.5 sm:py-3 font-medium flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>代碼 / 連結</span>
          </button>

          {/* Tab 4: File */}
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 min-w-[95px] py-2.5 sm:py-3 font-medium flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'file'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>備份檔 匯入/出</span>
          </button>

          {/* Tab 5: Version & Update */}
          <button
            onClick={() => setActiveTab('version')}
            className={`flex-1 min-w-[95px] py-2.5 sm:py-3 font-medium flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'version'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-amber-400" />
            <span>版本更新</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-200">
          {/* Status Message Notification */}
          {syncStatusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between border animate-in fade-in duration-150 ${
                isError
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span>{syncStatusMessage}</span>
              <button
                onClick={() => setSyncStatusMessage(null)}
                className="text-xs opacity-70 hover:opacity-100 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: In-App Camera QR Scanner */}
          {activeTab === 'scan' && (
            <div className="space-y-3">
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-emerald-300">App 內建鏡頭直接掃碼導入</div>
                  <div className="text-[11px] text-slate-300">
                    對準另一台電腦或手機顯示的 NexusNet QR Code，<strong>直接在 App 內自動套用</strong>，免開外部瀏覽器！
                  </div>
                </div>
              </div>

              {/* Live Camera Scanner */}
              <InAppQRScanner
                onScanSuccess={handleInAppScanSuccess}
                onClose={() => setActiveTab('code')}
                isPaused={!!pendingImport}
              />
            </div>
          )}

          {/* TAB 2: Show QR Code with Chunky Blocks & Zoom */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-3">
              {/* Density Mode Switcher (Single Fast vs Chunked Carousel) */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs max-w-full">
                <button
                  onClick={() => setQrDensityMode('single')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                    qrDensityMode === 'single'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={canFitSingleQr ? '單張大方塊，鏡頭秒速辨識' : '資料量較大，推薦分段輪播'}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>單張極速碼 {canFitSingleQr ? '(秒速讀取)' : '(大資料量)'}</span>
                </button>
                <button
                  onClick={() => setQrDensityMode('chunks')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                    qrDensityMode === 'chunks'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="自動分成大方塊輪播，徹底解決螢幕摩爾紋與超長資料問題"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>分段輪播碼 ({chunkFrames.length}片段·大方塊)</span>
                  {!canFitSingleQr && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-400/20 text-amber-300 font-bold">
                      推薦
                    </span>
                  )}
                </button>
              </div>

              {/* QR Code Canvas Frame (Completely unobstructed - NO icons covering the code!) */}
              <div className="p-3.5 bg-white rounded-3xl shadow-2xl border-2 border-slate-300 inline-block">
                <canvas ref={qrCanvasRef} className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] block" />
              </div>

              {/* Chunked Carousel Controls (When in chunks mode) */}
              {qrDensityMode === 'chunks' && (
                <div className="flex items-center justify-center gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <button
                    onClick={() => setChunkIndex((prev) => (prev - 1 + chunkFrames.length) % chunkFrames.length)}
                    className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                    title="上一張片段"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-amber-400 font-bold px-2">
                    片段 {(chunkIndex % chunkFrames.length) + 1} / {chunkFrames.length}
                  </span>
                  <button
                    onClick={() => setChunkIndex((prev) => (prev + 1) % chunkFrames.length)}
                    className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                    title="下一張片段"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsAutoPlayChunks(!isAutoPlayChunks)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                      isAutoPlayChunks
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isAutoPlayChunks ? '輪播中 (1.5s)' : '已暫停'}
                  </button>
                </div>
              )}

              {/* Separate Unobtrusive Action Bar (Enlarge button placed OUTSIDE canvas) */}
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <button
                  onClick={() => setIsEnlargedQr(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-md transition active:scale-[0.98]"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>放大全螢幕條碼</span>
                </button>
              </div>

              {/* Status Note */}
              <div className="text-[11px] text-slate-300 flex items-center justify-center gap-1.5">
                {qrDensityMode === 'single' && (
                  canFitSingleQr ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>方塊模組超大超清晰，鏡頭距離 30~50 公分即可瞬間捕捉！</span>
                    </span>
                  ) : (
                    <span className="text-amber-300 font-semibold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      <span>此圖譜資料豐富，強烈建議點選切換「分段輪播」或使用下方一鍵連結。</span>
                    </span>
                  )
                )}
                {qrDensityMode === 'chunks' && (
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>大方塊自動輪播（僅 {chunkFrames.length} 片段），手機鏡頭對準會自動連續拼接收齊！</span>
                  </span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full max-w-md">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <ExternalLink className="w-4 h-4" />}
                  <span>{copiedLink ? '已複製一鍵網址！' : '複製一鍵同步連結'}</span>
                </button>

                <button
                  onClick={handleCopyCode}
                  className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
                  <span>{copiedCode ? '已複製代碼！' : '複製同步代碼'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Code / Link */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">本機高壓縮同步代碼 (NNZ: zlib)</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 transition"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? '已複製！' : '複製代碼'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] font-mono text-slate-400 break-all max-h-24 overflow-y-auto border border-slate-800/80">
                  {fullCompression.compressedToken}
                </div>
              </div>

              {/* Paste Sync Code to Import */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  貼上從其他裝置複製的同步代碼或網址
                </label>
                <textarea
                  rows={3}
                  value={inputSyncCode}
                  onChange={(e) => setInputSyncCode(e.target.value)}
                  placeholder="在此貼上代碼 (以 NNZ: 開頭或舊版 Base64)，或一鍵同步網址..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {/* Sync Mode Choice */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs gap-2">
                <span className="text-slate-400 font-medium">導入模式：</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="codeSyncMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-sky-500"
                    />
                    <span>完全覆蓋 (推薦)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="codeSyncMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-sky-500"
                    />
                    <span>智慧合併 (保留本機新成員)</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleApplySyncCode}
                className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>立即解析並導入圖譜</span>
              </button>
            </div>
          )}

          {/* TAB 4: File Backup / Restore */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>下載本機備份檔</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      導出完整的 JSON 格式檔案，可隨時存放至雲端硬碟、AirDrop 或隨身碟。
                    </p>
                  </div>
                  <button
                    onClick={handleExportJson}
                    className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下載 JSON 備份 ({Math.round(fullCompression.originalSize / 1024 * 10) / 10} KB)</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Upload className="w-4 h-4 text-sky-400" />
                      <span>匯入現有備份檔</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      選擇其他裝置匯出的 JSON 檔案，快速恢復所有人際關係與自訂標籤。
                    </p>
                  </div>
                  <label className="w-full py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>選擇 JSON 檔案</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Data Safety Note */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  所有資料均 100% 保存在您自己裝置的瀏覽器（LocalStorage / IndexedDB）中，不經由第三方伺服器儲存，確保人脈隱私絕對安全。
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: Version & Update (Real Remote version.json & Cache Bypass) */}
          {activeTab === 'version' && (
            <div className="space-y-4 text-xs">
              {/* Version Comparison Card */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-white">NexusNet 人際關係網</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                        {currentVersion}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      建置日期：{buildDate} · PWA 離線安裝版
                    </div>
                  </div>

                  <button
                    onClick={checkForUpdates}
                    disabled={isChecking}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>{isChecking ? '正在連線比對...' : '檢查伺服器更新'}</span>
                  </button>
                </div>

                {/* Real-time Version Comparison Table */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                    <div className="text-slate-400">本機裝置運行版本</div>
                    <div className="font-bold text-sky-400 font-mono text-xs">{currentVersion}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                    <div className="text-slate-400">伺服器端最新發布</div>
                    <div className="font-bold text-emerald-400 font-mono text-xs">
                      {remoteVersion || '正在查詢伺服器...'}
                    </div>
                  </div>
                </div>

                {lastChecked && (
                  <div className="text-[10px] text-slate-500">
                    上次檢查時間：{lastChecked.toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* Update Status Banner */}
              {updateStatusMessage && (
                <div
                  className={`p-3.5 rounded-xl flex items-center justify-between border ${
                    updateAvailable
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{updateStatusMessage}</span>
                  </div>
                  {updateAvailable && (
                    <button
                      onClick={applyUpdate}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shrink-0 ml-2 shadow-md shadow-amber-500/20"
                    >
                      立即套用更新
                    </button>
                  )}
                </div>
              )}

              {/* App Icon Live Preview & Homescreen Diagnostic */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-slate-200">手機桌面圖示 (App Icon) 即時檢視</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold">
                    全彩實體圖檔
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-slate-700/80 shrink-0 bg-slate-900">
                    <img
                      src="./icon-192.png?v=1.0.6"
                      alt="NexusNet App Icon"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                      <span>當此處顯示彩色核心圖示：</span>
                      <span className="text-emerald-400 font-bold">伺服器圖檔已 100% 正確</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[10px]">
                      若重新加入主畫面依然抓到黑塊，是由於手機瀏覽器（Safari/Chrome）將舊圖標暫存在本地磁碟。請刪除桌面圖示後，點選下方「強制刷新」，或在網址最後加上 <code className="text-sky-300">?v=106</code> 重新開啟網頁後再加入主畫面。
                    </p>
                  </div>
                </div>
              </div>

              {/* Force Cache Bypass & Reset (For stubborn PWA / iOS cache) */}
              <div className="p-3.5 bg-slate-950/60 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300">
                <div className="space-y-0.5">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>手機 App 卡在舊版？強制繞過快取重整</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    一鍵清空瀏覽器快取儲存空間（CacheStorage），強制重新向伺服器拉取最新代碼與圖標。
                  </div>
                </div>
                <button
                  onClick={forceBypassCacheReload}
                  className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold transition shrink-0 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>強制刷新</span>
                </button>
              </div>

              {/* GitHub Pages Deployment Note */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-2 text-slate-400 text-[11px]">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-400" />
                  <span>GitHub Pages 部署進版說明</span>
                </div>
                <p className="leading-relaxed">
                  若您是將本專案部署至自己的 GitHub Pages 網址，當程式碼更新後，必須將變更推送至 GitHub 倉庫的 <code className="text-sky-300">main</code> 分支，GitHub Actions 自動編譯完成後（約需 1～2 分鐘），您的線上網址才會同步進版！
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('git add -A && git commit -m "Update NexusNet to v1.0.6-beta with new app icons" && git push');
                      alert('已複製 Git 部署指令！請在您的本機專案目錄執行終端機指令。');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                    <span>複製 Git 部署推播指令</span>
                  </button>
                </div>
              </div>

              {/* Changelog */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Beta 版本更新記錄</span>
                </div>
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {APP_CHANGELOG.map((item) => (
                    <div key={item.version} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-400 font-mono">{item.version}</span>
                        <span className="text-[10px] text-slate-500">{item.date}</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-200">{item.title}</div>
                      <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5 pl-1">
                        {item.features.map((feat, idx) => (
                          <li key={idx}>{feat}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/80 text-xs">
          <span className="text-slate-400 text-[11px]">
            目前圖譜：{network.members.length} 成員 · {network.relationships.length} 關係 · {currentVersion}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition font-medium"
          >
            關閉
          </button>
        </div>

        {/* EXPLICIT CONFIRMATION MODAL OVERLAY */}
        {pendingImport && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-4 sm:p-6 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-4 overflow-y-auto">
              {/* Header Banner */}
              <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-emerald-300">
                    條碼解析成功！請選擇導入方式
                  </h3>
                  <p className="text-xs text-slate-300">
                    {pendingImport.source === 'camera' && '📷 來自鏡頭即時掃碼辨識'}
                    {pendingImport.source === 'photo' && '🖼️ 來自選取相片辨識'}
                    {pendingImport.source === 'clipboard' && '📋 來自剪貼簿秒速讀取'}
                    {pendingImport.source === 'code' && '📝 來自手動貼上同步代碼'}
                    {pendingImport.source === 'file' && '📁 來自備份檔案'}
                  </p>
                </div>
              </div>

              {/* Comparison Cards */}
              {(() => {
                const incomingFieldCount = pendingImport.data.members.reduce((acc, m) => acc + (m.customFields?.length || 0), 0);
                const incomingNotesCount = pendingImport.data.members.filter((m) => m.notes && m.notes.trim()).length;
                const localFieldCount = network.members.reduce((acc, m) => acc + (m.customFields?.length || 0), 0);
                const localNotesCount = network.members.filter((m) => m.notes && m.notes.trim()).length;

                return (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Incoming Source */}
                    <div className="p-3.5 bg-slate-900 border border-emerald-500/40 rounded-2xl space-y-1.5 shadow-md">
                      <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>來源新圖譜資料</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-100">{pendingImport.data.members.length}</span>
                        <span className="text-xs text-slate-400">位成員</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        關係連線：<strong className="text-slate-200">{pendingImport.data.relationships.length}</strong> 條
                      </div>
                      <div className="text-[11px] text-emerald-400/90 pt-0.5 flex flex-wrap items-center gap-1 border-t border-slate-800/80">
                        <span>詳細欄位：</span>
                        <strong className="text-emerald-300 font-bold">{incomingFieldCount}</strong> 個自訂欄位
                        {incomingNotesCount > 0 && <span className="text-slate-400">({incomingNotesCount} 筆備註)</span>}
                      </div>
                    </div>

                    {/* Local Existing */}
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        <span>目前本機圖譜資料</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-100">{network.members.length}</span>
                        <span className="text-xs text-slate-400">位成員</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        關係連線：<strong className="text-slate-200">{network.relationships.length}</strong> 條
                      </div>
                      <div className="text-[11px] text-slate-400 pt-0.5 flex flex-wrap items-center gap-1 border-t border-slate-800/80">
                        <span>詳細欄位：</span>
                        <strong className="text-slate-300 font-medium">{localFieldCount}</strong> 個自訂欄位
                        {localNotesCount > 0 && <span className="text-slate-500">({localNotesCount} 筆備註)</span>}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Members Preview */}
              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400">即將導入的代表成員預覽：</div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {pendingImport.data.members.slice(0, 8).map((m, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-medium"
                    >
                      {m.name || '未命名'}
                    </span>
                  ))}
                  {pendingImport.data.members.length > 8 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800/60 text-slate-400 font-medium">
                      +{pendingImport.data.members.length - 8} 位...
                    </span>
                  )}
                </div>
              </div>

              {/* Mode Choice Selection Cards */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">請確認導入方式：</div>

                {/* Option 1: Replace */}
                <label
                  onClick={() => setImportMode('replace')}
                  className={`block p-3 rounded-2xl border transition cursor-pointer text-left ${
                    importMode === 'replace'
                      ? 'bg-emerald-950/40 border-emerald-500 text-slate-100 shadow-lg shadow-emerald-950/50'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="pendingImportMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-1 accent-emerald-500"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                        <span>完全覆蓋本機 (推薦)</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                          保證兩端完全一致
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        以接收到的圖譜資料「完全取代」目前本機資料，成員名冊、內部自訂欄位（電話/公司/生日等）與關係連線 100% 同步完全相同。
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option 2: Merge */}
                <label
                  onClick={() => setImportMode('merge')}
                  className={`block p-3 rounded-2xl border transition cursor-pointer text-left ${
                    importMode === 'merge'
                      ? 'bg-sky-950/40 border-sky-500 text-slate-100 shadow-lg shadow-sky-950/50'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="pendingImportMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-1 accent-sky-500"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                        <span>智慧深度合併 (雙方欄位智慧融合)</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold">
                          內部資料絕不遺漏
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        深度比對同名與同 ID 成員，智慧融合同一人員的內部自訂欄位（電話、公司、生日、備註等），保留雙方資料與新關係，絕不忽略任何單元內容！
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex gap-2 border-t border-slate-800 mt-2">
              <button
                onClick={handleCancelPendingImport}
                className="flex-1 py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                放棄 / 重新掃描
              </button>
              <button
                onClick={handleConfirmApplyImport}
                className="flex-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <Check className="w-4 h-4 text-white" />
                <span>確認套用並導入圖譜</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FULLSCREEN ENLARGED QR CODE MODAL (Responsive, will NEVER overflow on mobile screens) */}
      {isEnlargedQr && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 p-4 sm:p-6 rounded-3xl max-w-sm sm:max-w-md w-full flex flex-col items-center text-center space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between w-full pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-sm text-white">超大清晰同步條碼</span>
              </div>
              <button
                onClick={() => setIsEnlargedQr(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Responsive Canvas Frame */}
            <div className="p-3 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-slate-200 flex items-center justify-center max-w-[88vw]">
              <canvas
                ref={enlargedQrCanvasRef}
                className="w-[min(280px,72vw)] h-[min(280px,72vw)] sm:w-[340px] sm:h-[340px] block aspect-square"
              />
            </div>

            {/* Chunk Carousel Controls in Enlarged Mode */}
            {qrDensityMode === 'chunks' && chunkFrames.length > 1 && (
              <div className="w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-2.5 flex flex-col items-center gap-2">
                <div className="flex items-center justify-between w-full px-2">
                  <button
                    onClick={() => {
                      setIsAutoPlayChunks(false);
                      setChunkIndex((prev) => (prev - 1 + chunkFrames.length) % chunkFrames.length);
                    }}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1 text-xs font-semibold transition"
                    title="上一張片段"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>上一張</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-sky-400">
                      片段 {(chunkIndex % chunkFrames.length) + 1} / {chunkFrames.length}
                    </span>
                    <button
                      onClick={() => setIsAutoPlayChunks(!isAutoPlayChunks)}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        isAutoPlayChunks
                          ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-600/30 text-amber-400 border border-amber-500/40'
                      }`}
                      title={isAutoPlayChunks ? '暫停輪播' : '繼續自動輪播'}
                    >
                      {isAutoPlayChunks ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>輪播中</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>已暫停</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setIsAutoPlayChunks(false);
                      setChunkIndex((prev) => (prev + 1) % chunkFrames.length);
                    }}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1 text-xs font-semibold transition"
                    title="下一張片段"
                  >
                    <span>下一張</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Mini Dots */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                  {chunkFrames.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setIsAutoPlayChunks(false);
                        setChunkIndex(i);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        i === chunkIndex % chunkFrames.length
                          ? 'w-6 bg-sky-400'
                          : 'w-2 bg-slate-600 hover:bg-slate-500'
                      }`}
                      title={`切換到片段 ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-emerald-400">
                {qrDensityMode === 'single'
                  ? '⚡ 單張極速碼：方塊超大，鏡頭秒速辨識'
                  : `🎞️ 分段輪播：第 ${(chunkIndex % chunkFrames.length) + 1} / ${chunkFrames.length} 片段（大方塊好掃描）`}
              </div>
              <p className="text-[11px] text-slate-400">
                {qrDensityMode === 'chunks'
                  ? '接收端相機保持對準，畫面會自動辨識並收集齊全；亦可手動切換片段或暫停對焦。'
                  : '請將接收端相機對準條碼即可秒速完成傳輸。'}
              </p>
            </div>

            <button
              onClick={() => setIsEnlargedQr(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              關閉放大視圖
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
