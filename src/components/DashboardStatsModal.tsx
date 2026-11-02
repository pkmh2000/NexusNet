import React, { useRef } from 'react';
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

  if (!isOpen) return null;

  const totalMembers = network.members.length;
  const totalRelationships = network.relationships.length;

  // Calculate network density
  const maxPossibleEdges = totalMembers > 1 ? (totalMembers * (totalMembers - 1)) / 2 : 1;
  const density = totalMembers > 1 ? ((totalRelationships / maxPossibleEdges) * 100).toFixed(1) : '0';

  // Category counts
  const groupCounts = network.members.reduce<Record<string, number>>((acc, m) => {
    acc[m.group] = (acc[m.group] || 0) + 1;
    return acc;
  }, {});

  // Birthday radar: scan all members with solar/lunar dates coming up within 45 days
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
        alert('備份還原成功！人際關係網絡已同步更新。');
        onClose();
      } catch (err: any) {
        alert('匯入備份失敗：' + (err.message || '無效的備份檔案格式'));
      }
    };
    reader.readAsText(file);
  };

  // Estimate storage size
  const dataSizeBytes = new Blob([JSON.stringify(network)]).size;
  const dataSizeKb = (dataSizeBytes / 1024).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">人際資源與網絡監控儀表板</h3>
              <p className="text-[11px] text-slate-400">即時監控社群脈絡、生日提醒與自動化資料備份</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

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
