import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { NetworkGraphData, Member, Relationship } from '../types';
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
} from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  network: NetworkGraphData;
  onImportData: (data: NetworkGraphData, mode: 'replace' | 'merge') => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  network,
  onImportData,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'code' | 'file' | 'guide'>('qr');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('replace');
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate lightweight sync payload
  const syncPayload = JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    members: network.members,
    relationships: network.relationships,
  });

  // Base64 encode for string token
  const base64SyncCode = btoa(unescape(encodeURIComponent(syncPayload)));

  // Shareable link with hash
  const shareableUrl = `${window.location.origin}${window.location.pathname}#sync=${base64SyncCode}`;

  useEffect(() => {
    if (!isOpen) {
      setSyncStatusMessage(null);
      return;
    }

    // Generate QR Code onto canvas
    if (qrCanvasRef.current) {
      // Due to QR code byte capacity, we encode the shareable link or the base64 data
      // If payload is small enough, encode the full shareable URL so phone camera opens directly!
      const targetContent = shareableUrl.length < 2500 ? shareableUrl : base64SyncCode;

      QRCode.toCanvas(
        qrCanvasRef.current,
        targetContent,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) {
            console.error('QR code generation error:', err);
          }
        }
      );
    }
  }, [isOpen, activeTab, shareableUrl, base64SyncCode]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(base64SyncCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (_) {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = base64SyncCode;
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
      setSyncStatusMessage('請先貼上同步代碼！');
      return;
    }

    try {
      let rawJson = '';
      const trimmed = inputSyncCode.trim();

      // Check if it's a URL with #sync=
      if (trimmed.includes('#sync=')) {
        const hashPart = trimmed.split('#sync=')[1];
        rawJson = decodeURIComponent(escape(atob(hashPart)));
      } else {
        // Try base64
        try {
          rawJson = decodeURIComponent(escape(atob(trimmed)));
        } catch (_) {
          // If not base64, try direct JSON
          rawJson = trimmed;
        }
      }

      const parsed = JSON.parse(rawJson);
      if (!parsed.members || !Array.isArray(parsed.members) || !parsed.relationships) {
        throw new Error('資料結構不符合 NexusNet 圖譜格式');
      }

      onImportData(parsed, importMode);
      setIsError(false);
      setSyncStatusMessage(
        importMode === 'replace'
          ? `已成功覆蓋同步！共 ${parsed.members.length} 位成員、${parsed.relationships.length} 條關係連線。`
          : `已成功智慧合併！目前已同步最新資料。`
      );
      setInputSyncCode('');
    } catch (err: any) {
      setIsError(true);
      setSyncStatusMessage(`同步代碼解析失敗：${err.message || '格式錯誤'}`);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(syncPayload);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `NexusNet_Graph_Backup_${new Date().toISOString().slice(0, 10)}.json`);
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
        const parsed = JSON.parse(content);
        if (!parsed.members || !parsed.relationships) {
          throw new Error('非有效的 NexusNet 檔案格式');
        }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 flex items-center justify-center text-sky-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>跨裝置同步中心</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                  手機 · 平板 · 電腦
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                無需登入帳號，透過 QR Code、同步代碼或一鍵連結即可在不同裝置間同步圖譜
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
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-3 font-medium flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'qr'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code 掃描</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-3 font-medium flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'code'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>同步代碼 / 連結</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-3 font-medium flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'file'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>備份檔 匯出/匯入</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-3 font-medium flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'guide'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>同步指南</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Status Message Notification */}
          {syncStatusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
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

          {/* TAB 1: QR Code Sync */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-300 inline-block">
                <canvas ref={qrCanvasRef} className="w-[200px] h-[200px]" />
              </div>

              <div className="max-w-md space-y-1.5">
                <div className="text-sm font-semibold text-slate-200 flex items-center justify-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>使用手機或平板相機直接掃描</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  將手機相機對準上方 QR Code，即可在手機瀏覽器開啟並自動同步目前的完整人際關係網（含 {network.members.length} 位成員與 {network.relationships.length} 條關係線）。
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <ExternalLink className="w-4 h-4 text-sky-400" />}
                  <span>{copiedLink ? '已複製同步連結！' : '複製一鍵同步網址'}</span>
                </button>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
                  <span>{copiedCode ? '已複製同步代碼！' : '複製純文字同步代碼'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Sync Code / Direct Import */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">本機人際圖譜同步代碼</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 transition"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? '已複製！' : '複製代碼'}</span>
                  </button>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg text-[11px] font-mono text-slate-400 break-all max-h-20 overflow-y-auto border border-slate-800/80">
                  {base64SyncCode}
                </div>
              </div>

              {/* Paste Sync Code to Import */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  從其他裝置貼上同步代碼或同步網址
                </label>
                <textarea
                  rows={3}
                  value={inputSyncCode}
                  onChange={(e) => setInputSyncCode(e.target.value)}
                  placeholder="在此貼上從手機、平板或桌機複製的同步代碼，或一鍵同步網址..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {/* Sync Mode Choice */}
              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-medium">同步覆蓋模式：</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="syncMode"
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
                      name="syncMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-sky-500"
                    />
                    <span>智慧合併 (不刪現有)</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleApplySyncCode}
                className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>立即解析並套用同步</span>
              </button>
            </div>
          )}

          {/* TAB 3: File Backup / Restore */}
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
                    <span>下載 JSON 備份</span>
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

          {/* TAB 4: Step-by-Step Guide */}
          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="font-semibold text-sky-300 flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  <span>情境一：桌機 ➔ 手機 / 平板（最推薦方式）</span>
                </div>
                <ol className="list-decimal list-inside text-slate-300 space-y-1 pl-1">
                  <li>在桌機開啟「跨裝置同步」，停留在「QR Code 掃描」頁籤。</li>
                  <li>拿起手機或 iPad 打開內建相機，對準螢幕上的 QR Code。</li>
                  <li>點擊手機畫面上方跳出的網址通知，即可在手機上完整開啟並同步目前的人際圖譜！</li>
                  <li>（可選）點擊手機 Safari 或 Chrome 的「加入主畫面」，立即享有原生 App 般的離線體驗。</li>
                </ol>
              </div>

              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="font-semibold text-emerald-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>情境二：手機 ➔ 桌機</span>
                </div>
                <ol className="list-decimal list-inside text-slate-300 space-y-1 pl-1">
                  <li>在手機端點擊「同步代碼 / 連結」，點擊「複製純文字同步代碼」。</li>
                  <li>透過 Line、AirDrop、Telegram 或 Email 發送到桌機。</li>
                  <li>在桌機打開 NexusNet，進入「跨裝置同步」➔ 貼上代碼 ➔ 點擊「立即解析並套用同步」！</li>
                </ol>
              </div>

              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="font-semibold text-amber-300 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>什麼時候需要手動同步？</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  由於 NexusNet 採用零雲端隱私架構，當您在手機新增或編輯了成員後，只要複製同步代碼或一鍵連結貼到桌機，就能隨時保持多裝置一致。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/60 text-xs">
          <span className="text-slate-500">
            目前圖譜：{network.members.length} 成員 · {network.relationships.length} 關係
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
