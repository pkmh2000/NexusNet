import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { NetworkGraphData } from '../types';
import { InAppQRScanner } from './InAppQRScanner';
import { compressNetworkData, decompressNetworkData } from '../utils/syncCodec';
import { APP_VERSION, APP_BUILD_DATE, APP_CHANGELOG } from '../version';
import { useAppUpdate } from '../hooks/useAppUpdate';
import {
  X,
  Smartphone,
  Monitor,
  QrCode,
  Copy,
  Check,
  Download,
  Upload,
  ArrowRightLeft,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
  Camera,
  Share2,
  CheckCircle2,
  AlertCircle,
  Rocket,
  RotateCcw,
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
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('replace');
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // App update manager
  const {
    currentVersion,
    buildDate,
    isChecking,
    updateAvailable,
    statusMessage: updateStatusMessage,
    lastChecked,
    checkForUpdates,
    applyUpdate,
    forceClearCache,
  } = useAppUpdate();

  // Compressed Sync Payload using pako (reduces 15KB JSON down to ~1.2KB)
  const compressionResult = React.useMemo(() => {
    return compressNetworkData(network);
  }, [network]);

  const { compressedToken, rawJson, originalSize, compressedSize } = compressionResult;

  // Shareable link with hash
  const shareableUrl = `${window.location.origin}${window.location.pathname}#sync=${compressedToken}`;

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

  // Generate QR Code when on 'qr' tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'qr') return;

    if (qrCanvasRef.current) {
      try {
        // Encode compressedToken into QR Code
        QRCode.toCanvas(
          qrCanvasRef.current,
          compressedToken,
          {
            width: 230,
            margin: 2,
            errorCorrectionLevel: 'L', // Low error correction maximizes capacity (up to 2,953 bytes)
            color: {
              dark: '#020617',
              light: '#ffffff',
            },
          },
          (err) => {
            if (err) {
              console.warn('QR code compression error fallback:', err);
              // Fallback to URL if raw token hit limit
              if (qrCanvasRef.current) {
                QRCode.toCanvas(qrCanvasRef.current, shareableUrl.slice(0, 2000), {
                  width: 230,
                  margin: 2,
                  errorCorrectionLevel: 'L',
                });
              }
            }
          }
        );
      } catch (err) {
        console.error('QR code render exception:', err);
      }
    }
  }, [isOpen, activeTab, compressedToken, shareableUrl]);

  if (!isOpen) return null;

  // In-App Scanner Success Handler
  const handleInAppScanSuccess = (scannedData: NetworkGraphData) => {
    onImportData(scannedData, importMode);
    setIsError(false);
    setSyncStatusMessage(
      `鏡頭掃描成功！已直接在 App 內載入 ${scannedData.members.length} 位成員與 ${scannedData.relationships.length} 條關係線。`
    );
    setActiveTab('code'); // Switch back to code/summary tab
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(compressedToken);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = compressedToken;
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

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NexusNet 人際圖譜同步資料',
          text: `NexusNet 人際圖譜同步（含 ${network.members.length} 位成員、${network.relationships.length} 條關係線）`,
          url: shareableUrl,
        });
      } catch (_) {}
    } else {
      handleCopyLink();
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
      onImportData(parsed, importMode);
      setIsError(false);
      setSyncStatusMessage(
        importMode === 'replace'
          ? `已成功覆蓋同步！共載入 ${parsed.members.length} 位成員、${parsed.relationships.length} 條關係連線。`
          : `已成功智慧合併！目前已同步最新資料。`
      );
      setInputSyncCode('');
    } catch (err: any) {
      setIsError(true);
      setSyncStatusMessage(`同步代碼解析失敗：${err.message || '格式錯誤'}`);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(rawJson);
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
        onImportData(parsed, importMode);
        setIsError(false);
        setSyncStatusMessage(`檔案匯入成功！共載入 ${parsed.members.length} 位成員。`);
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
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
                App 內建鏡頭直接掃碼導入 · 免開瀏覽器 · 智慧更新
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
          {/* Tab 1: In-App Scanner (User's primary request) */}
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
                  <div className="font-bold text-emerald-300">App 內建鏡頭掃描導入</div>
                  <div className="text-[11px] text-slate-300">
                    拿起手機，直接對準電腦螢幕或其他裝置顯示的 NexusNet 同步條碼，掃描後將<strong>直接在 App 內自動套用</strong>，絕不跳轉至外部瀏覽器！
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-medium">導入模式：</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="scannerMode"
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
                      name="scannerMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-sky-500"
                    />
                    <span>智慧合併</span>
                  </label>
                </div>
              </div>

              {/* Live Camera Scanner */}
              <InAppQRScanner
                onScanSuccess={handleInAppScanSuccess}
                onClose={() => setActiveTab('code')}
              />
            </div>
          )}

          {/* TAB 2: Show Compressed QR Code */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-3.5">
              {/* QR Code Canvas Frame */}
              <div className="relative p-3 bg-white rounded-2xl shadow-xl border border-slate-300 inline-block">
                <canvas ref={qrCanvasRef} className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] block" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>極限壓縮條碼 (含全部 {network.members.length} 位成員與 {network.relationships.length} 條關係)</span>
              </div>

              <div className="max-w-md bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left space-y-1.5 text-xs">
                <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>如何在手機 App 內接收？</span>
                </div>
                <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1">
                  <li>在手機打開 NexusNet App。</li>
                  <li>點擊底部「功能選單」➔「跨裝置同步」。</li>
                  <li>切換至第一個頁籤「<strong>鏡頭掃碼導入</strong>」。</li>
                  <li>對準上方 QR Code，即可在 App 內瞬間完成同步導入！</li>
                </ol>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex justify-between">
                  <span>原始 JSON: {Math.round(originalSize / 1024 * 10) / 10} KB</span>
                  <span className="text-emerald-400 font-bold">zlib 壓縮後: {Math.round(compressedSize / 1024 * 10) / 10} KB (節省 {Math.round((1 - compressedSize / originalSize) * 100)}%)</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full max-w-md">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <ExternalLink className="w-4 h-4" />}
                  <span>{copiedLink ? '已複製同步連結！' : '複製一鍵同步連結'}</span>
                </button>

                <button
                  onClick={handleCopyCode}
                  className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
                  <span>{copiedCode ? '已複製代碼！' : '複製壓縮代碼'}</span>
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
                  {compressedToken}
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
                    <span>下載 JSON 備份 ({Math.round(originalSize / 1024 * 10) / 10} KB)</span>
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

          {/* TAB 5: Version & Update (User request: app 是不是沒有更新機制? 現在起 添加 beta version!) */}
          {activeTab === 'version' && (
            <div className="space-y-4 text-xs">
              {/* Current Version Card */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  {lastChecked && (
                    <div className="text-[10px] text-slate-500">
                      上次檢查：{lastChecked.toLocaleTimeString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={checkForUpdates}
                    disabled={isChecking}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>{isChecking ? '正在檢查...' : '檢查最新版本'}</span>
                  </button>
                </div>
              </div>

              {/* Update Status Banner */}
              {updateStatusMessage && (
                <div
                  className={`p-3 rounded-xl flex items-center justify-between border ${
                    updateAvailable
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
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
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shrink-0 ml-2"
                    >
                      立即套用更新
                    </button>
                  )}
                </div>
              )}

              {/* Force Cache Reset (Troubleshooting) */}
              <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between text-slate-400 text-[11px]">
                <div>
                  <div className="font-medium text-slate-300">遇到畫面未更新或快取殘留？</div>
                  <div>一鍵強制清除瀏覽器本機 Service Worker 快取並重整。</div>
                </div>
                <button
                  onClick={forceClearCache}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition shrink-0 ml-2 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>強制刷新</span>
                </button>
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
      </div>
    </div>
  );
};
