import React, { useRef, useState } from 'react';
import { Member, Relationship, NetworkGraphData } from '../types';
import { exportBackupJson, importBackupJson } from '../utils/storage';
import { getBirthdayCountdown, solarToLunar } from '../utils/lunarCalendar';
import {
  X,
  Activity,
  Download,
  Upload,
  RotateCcw,
  Users,
  Share2,
  Calendar,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  Globe,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface DashboardStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  network: NetworkGraphData;
  onRestoreData: (restored: NetworkGraphData) => void;
  onResetData: () => void;
  onSelectMember: (memberId: string) => void;
}

export const DashboardStatsModal: React.FC<DashboardStatsModalProps> = ({
  isOpen,
  onClose,
  network,
  onRestoreData,
  onResetData,
  onSelectMember,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  if (!isOpen) return null;

  const totalMembers = network.members.length;
  const totalRelationships = network.relationships.length;

  const maxPossibleEdges = totalMembers > 1 ? (totalMembers * (totalMembers - 1)) / 2 : 1;
  const density = totalMembers > 1 ? ((totalRelationships / maxPossibleEdges) * 100).toFixed(1) : '0';

  const groupCounts = network.members.reduce<Record<string, number>>((acc, m) => {
    acc[m.group] = (acc[m.group] || 0) + 1;
    return acc;
  }, {});

  const upcomingBirthdays = network.members
    .map((m) => {
      const bdayField = m.customFields.find((f) => f.type === 'solar_date' || f.type === 'lunar_date');
      if (!bdayField) return null;
      const cd = getBirthdayCountdown(bdayField.value);
      if (!cd || cd.daysLeft > 60) return null;
      const lunar = solarToLunar(bdayField.value);
      return {
        member: m,
        daysLeft: cd.daysLeft,
        isToday: cd.isToday,
        age: cd.age,
        solarDate: bdayField.value,
        lunarText: lunar ? lunar.formattedText : '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.daysLeft - b!.daysLeft);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const restored = importBackupJson(content);
        onRestoreData(restored);
        setNotification({ message: '備份還原成功！人際網絡已同步更新。' });
        setTimeout(() => setNotification(null), 3000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '無效的備份檔案格式';
        setNotification({ message: '匯入備份失敗：' + msg, isError: true });
        setTimeout(() => setNotification(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  const dataSizeBytes = new Blob([JSON.stringify(network)]).size;
  const dataSizeKb = (dataSizeBytes / 1024).toFixed(1);

  const handleCopyGitCommand = () => {
    navigator.clipboard.writeText('git add . && git commit -m "Deploy NexusNet to GitHub Pages" && git push');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-sky-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">人際資源與網絡監控儀表板</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-400/30 uppercase">
                  Beta Version
                </span>
              </div>
              <p className="text-[11px] text-slate-400">即時監控社群脈絡、生日提醒、GitHub Pages 部署與備份</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* In-app notification */}
        {notification && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between transition-all ${
              notification.isError
                ? 'bg-red-500/20 text-red-200 border-b border-red-500/30'
                : 'bg-emerald-500/20 text-emerald-200 border-b border-emerald-500/30'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>總聯絡人數</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white tabular-nums">{totalMembers}</div>
              <div className="text-[10px] text-slate-500 mt-1">活躍人際單元</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>關係連線數</span>
                <Share2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white tabular-nums">{totalRelationships}</div>
              <div className="text-[10px] text-slate-500 mt-1">多層交織連線</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>網絡連結密度</span>
                <Activity className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white tabular-nums">{density}%</div>
              <div className="text-[10px] text-slate-500 mt-1">稠密凝聚指標</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>儲存監控</span>
                <HardDrive className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white tabular-nums">{dataSizeKb} KB</div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                本地加密健康
              </div>
            </div>
          </div>

          {/* GitHub Pages Deployment Support Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                <h4 className="font-semibold text-slate-200">GitHub Pages 網頁安裝與部署支援</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                已內建自動部署工作流
              </span>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed mb-3">
              本系統已完整內建 GitHub Pages 部署規範（相對基底路徑 <code className="text-sky-300">base: './'</code>、動態 Scope 快取與 <code className="text-sky-300">.github/workflows/static.yml</code>）。部署後享有免費 SSL/HTTPS 憑證與跨平台 PWA 安裝。
            </p>

            <div className="space-y-1.5 text-[11px] text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold shrink-0">1.</span>
                <span>推送到 GitHub 倉庫後，進入倉庫的 <strong>Settings → Pages</strong>。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold shrink-0">2.</span>
                <span>在 <strong>Build and deployment → Source</strong> 下拉選單選擇 <strong>GitHub Actions</strong>。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">3.</span>
                <span>
                  <strong>若出現建議模板（Jekyll 或 Static HTML）</strong>：請<strong>不要</strong>選擇 Jekyll。因專案已具備 <code className="text-sky-300">.github/workflows/static.yml</code>，只要推送程式碼後，Actions 分頁即會自動執行 Vite 編譯部署！若點擊 Static HTML 的 Configure，直接確認其包含 npm build 指令即可。
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold shrink-0">4.</span>
                <span>發布完成後瀏覽網址（如 <code className="text-sky-300">https://&lt;帳號&gt;.github.io/&lt;專案&gt;/</code>），即可一鍵安裝為 PWA 獨立桌面/手機 App！</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={handleCopyGitCommand}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已複製 Git 推送指令！' : '複製 Git 推送指令'}</span>
              </button>
              <span className="text-[10px] text-slate-500">含 404 SPA 重導向保護</span>
            </div>
          </div>

          {/* Group Breakdown Bar */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              人脈圈層分佈統計
            </h4>
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-800/30 border border-slate-800">
              {Object.entries(groupCounts).map(([groupName, count]) => {
                const percent = Math.round((count / totalMembers) * 100);
                return (
                  <div key={groupName} className="space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>{groupName}</span>
                      <span className="font-mono text-slate-400">{count} 人 ({percent}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Birthday Radar */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                近期生日提醒 (國曆 / 農曆雙軌雷達)
              </h4>
            </div>

            {upcomingBirthdays.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-slate-500">
                未來 60 天內無即將過生日的聯絡人（可於成員頁面添加「國曆生日」欄位）。
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {upcomingBirthdays.map((item) => {
                  if (!item) return null;
                  return (
                    <div
                      key={item.member.id}
                      onClick={() => {
                        onSelectMember(item.member.id);
                        onClose();
                      }}
                      className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: item.member.avatarColor || '#3b82f6' }}
                        >
                          {item.member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200">{item.member.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.solarDate} · {item.lunarText}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono font-medium ${
                            item.isToday
                              ? 'bg-amber-500 text-black animate-pulse font-bold'
                              : 'bg-slate-800 text-amber-300'
                          }`}
                        >
                          {item.isToday ? '今天生日！' : `${item.daysLeft} 天後`}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">將滿 {item.age} 歲</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Backup & System Controls */}
          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>自動化備份與本地資料庫安全</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => exportBackupJson(network)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border border-sky-500/30 font-medium transition"
              >
                <Download className="w-4 h-4" />
                <span>匯出 JSON 備份檔</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-medium transition"
              >
                <Upload className="w-4 h-4" />
                <span>匯入備份還原</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => {
                  if (confirm('確定要重置為預設示範人際關係庫嗎？現有自訂內容將被覆寫。')) {
                    onResetData();
                    onClose();
                  }
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重置為範例庫</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
