import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { NetworkGraphData } from '../types';
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
  HelpCircle,
  Share2,
  CheckCircle2,
  AlertCircle,
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
  const [activeTab, setActiveTab] = useState<'qr' | 'code' | 'file' | 'faq'>('qr');
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
  const appBaseUrl = `${window.location.origin}${window.location.pathname}`;

  // Safe QR capacity limit (bytes): ~1,500 chars for reliable scanning on screens
  const isDirectDataInQR = shareableUrl.length <= 1500;
  const qrTargetContent = isDirectDataInQR ? shareableUrl : appBaseUrl;

  // Auto-fill from URL hash if user opened with #sync=
  useEffect(() => {
    if (isOpen && window.location.hash.includes('#sync=')) {
      const hashToken = window.location.hash.split('#sync=')[1];
      if (hashToken) {
        setInputSyncCode(hashToken);
        setActiveTab('code');
      }
    }
  }, [isOpen]);

  // Generate QR Code with fallback to prevent blank canvas
  useEffect(() => {
    if (!isOpen) {
      setSyncStatusMessage(null);
      return;
    }

    if (qrCanvasRef.current) {
      try {
        QRCode.toCanvas(
          qrCanvasRef.current,
          qrTargetContent,
          {
            width: 220,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          },
          (err) => {
            if (err) {
              console.error('QR code generation error, falling back to base URL:', err);
              // Fallback to basic app URL if encoding failed
              if (qrCanvasRef.current) {
                QRCode.toCanvas(qrCanvasRef.current, appBaseUrl, {
                  width: 220,
                  margin: 2,
                  color: { dark: '#0f172a', light: '#ffffff' },
                });
              }
            }
          }
        );
      } catch (err) {
        console.error('QR code render exception:', err);
      }
    }
  }, [isOpen, activeTab, qrTargetContent, appBaseUrl]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(base64SyncCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (_) {
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

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NexusNet 人際關係網同步連結',
          text: `NexusNet 人際圖譜同步資料（含 ${network.members.length} 位成員、${network.relationships.length} 條關係線）`,
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
      let rawJson = '';
      const trimmed = inputSyncCode.trim();

      if (trimmed.includes('#sync=')) {
        const hashPart = trimmed.split('#sync=')[1];
        rawJson = decodeURIComponent(escape(atob(hashPart)));
      } else {
        try {
          rawJson = decodeURIComponent(escape(atob(trimmed)));
        } catch (_) {
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

  const payloadKb = Math.round((syncPayload.length / 1024) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>跨裝置同步中心</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                  手機 · 平板 · 電腦
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                免登入帳號，透過 QR Code、一鍵同步連結或代碼在裝置間即刻同步
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
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 min-w-[90px] py-2.5 sm:py-3 font-medium flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'qr'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code 掃描</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 min-w-[90px] py-2.5 sm:py-3 font-medium flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>同步代碼 / 連結</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 min-w-[90px] py-2.5 sm:py-3 font-medium flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'file'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>備份檔 匯入/匯出</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 min-w-[90px] py-2.5 sm:py-3 font-medium flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'faq'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>差異與掃描說明</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-200">
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
            <div className="flex flex-col items-center text-center space-y-3.5">
              {/* QR Code Canvas Frame */}
              <div className="relative p-3 bg-white rounded-2xl shadow-xl border border-slate-300 inline-block">
                <canvas ref={qrCanvasRef} className="w-[190px] h-[190px] sm:w-[210px] sm:h-[210px] block" />
              </div>

              {/* Mode Indicator Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                <span>手機相機直接對準螢幕掃描</span>
              </div>

              {/* Context Explanation */}
              {isDirectDataInQR ? (
                <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                  拿起手機或 iPad 相機對準上方 QR Code，掃描後將直接開啟並自動套用目前人際圖譜。
                </p>
              ) : (
                <div className="max-w-md bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left space-y-1.5">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>掃描說明（大資料量圖譜）</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    目前圖譜包含 <strong className="text-white">{network.members.length} 位成員</strong> 與 <strong className="text-white">{network.relationships.length} 條關係線</strong>（資料約 {payloadKb} KB）。
                    手機相機掃描上方 QR Code 會直接在手機瀏覽器打開 NexusNet！
                  </p>
                  <p className="text-[11px] text-sky-300 font-medium leading-relaxed">
                    👉 打開後，點擊下方「<strong>複製一鍵同步連結</strong>」發送至手機（Line / AirDrop），點擊連結即會自動彈出同步視窗！
                  </p>
                </div>
              )}

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
                  <span>{copiedCode ? '已複製代碼！' : '複製同步代碼'}</span>
                </button>

                {typeof navigator.share === 'function' && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full px-3.5 py-2 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>AirDrop / 社群分享同步連結</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Sync Code / Direct Import */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">本機人際圖譜同步代碼 (Base64)</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 transition"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? '已複製！' : '複製代碼'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] font-mono text-slate-400 break-all max-h-24 overflow-y-auto border border-slate-800/80">
                  {base64SyncCode}
                </div>
              </div>

              {/* Paste Sync Code to Import */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  從其他裝置貼上同步代碼或一鍵同步連結
                </label>
                <textarea
                  rows={3}
                  value={inputSyncCode}
                  onChange={(e) => setInputSyncCode(e.target.value)}
                  placeholder="在此貼上從手機、平板或電腦複製的同步代碼，或帶有 #sync= 的一鍵連結..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {/* Sync Mode Choice */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs gap-2">
                <span className="text-slate-400 font-medium">同步方式：</span>
                <div className="flex items-center gap-4">
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
                    <span>智慧合併 (保留本機新成員)</span>
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
                    <span>下載 JSON 備份 ({payloadKb} KB)</span>
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

          {/* TAB 4: FAQ & Differences (Answers to user questions) */}
          {activeTab === 'faq' && (
            <div className="space-y-3.5 text-xs">
              {/* Question 1: Receiving End */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Q1：接收端 是在 App 內開啟 或用一般手機相機掃描即可？</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-5">
                  <strong>只要用一般手機內建相機掃描即可！</strong> 不需要事先下載任何專屬 App 或特定掃碼工具：
                </p>
                <ul className="list-disc list-inside text-slate-400 space-y-1 pl-5 text-[11px]">
                  <li><strong>iPhone / iPad</strong>：打開內建「相機」對準螢幕，上方會彈出 Safari 黃色通知，點擊即可開啟。</li>
                  <li><strong>Android</strong>：打開相機或 Google 智慧鏡頭掃描，點擊在 Chrome 開啟。</li>
                  <li>當手機打開帶有同步資料的網址時，NexusNet 會<strong>自動彈出同步詢問視窗</strong>，一鍵點擊「套用」即完成同步！</li>
                </ul>
              </div>

              {/* Question 2: Differences between QR code, Link, Code */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Q2：QR Code、一鍵同步連結、同步代碼 有什麼差別？</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="font-semibold text-sky-300 mb-1 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Code 掃描</span>
                    </div>
                    <p className="text-slate-400 leading-normal">
                      <strong>最適合：桌機 ➔ 手機</strong>。電腦螢幕顯示條碼，手機相機一秒開啟網站，無需手動打字。受限於黑白圖片容量（約 2KB）。
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-sky-500/30">
                    <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>一鍵同步連結 (最推薦)</span>
                    </div>
                    <p className="text-slate-400 leading-normal">
                      <strong>最推薦：跨裝置通訊</strong>。複製網址發到 Line 或 AirDrop，接收端手機<strong>點擊網址打開立即自動套用</strong>。
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="font-semibold text-amber-300 mb-1 flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" />
                      <span>純文字同步代碼</span>
                    </div>
                    <p className="text-slate-400 leading-normal">
                      <strong>最穩定：無長度限制</strong>。將 Base64 字串貼到任何筆記本或聊天軟體，在接收端點擊「解析套用」100% 保真。
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 3: Blank QR code issue explanation */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Q3：為什麼先前會出現「空白 QR Code」？</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-5 text-[11px]">
                  二維條碼（QR Code）在物理規格上最多只能容納約 2,000 ~ 2,900 字元。先前因完整人脈圖譜（數十位成員、關係線、電話、筆記）高達 15,000 字元，硬塞導致底層條碼產生器溢位報錯而空白。
                  現已升級<strong>智慧安全容量偵測</strong>：保證 QR Code 永遠清晰完整可掃描，並提供一鍵同步連結作為最順暢的管道！
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/80 text-xs">
          <span className="text-slate-400 text-[11px]">
            目前圖譜：{network.members.length} 成員 · {network.relationships.length} 關係 · {payloadKb} KB
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
