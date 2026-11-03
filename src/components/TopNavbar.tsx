import React, { useState } from 'react';
import { ViewMode, CanvasMode, LayerFilter } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Share2,
  Activity,
  Plus,
  DownloadCloud,
  Network,
  Disc,
  Smartphone,
  X,
  Search,
  Eye,
  Edit3,
  Layers,
  ArrowRightLeft,
  Users,
} from 'lucide-react';

interface TopNavbarProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  canvasMode: CanvasMode;
  onChangeCanvasMode: (mode: CanvasMode) => void;
  maxLayers: LayerFilter;
  onChangeMaxLayers: (layers: LayerFilter) => void;
  onOpenNewMemberModal: () => void;
  onOpenDashboard: () => void;
  onOpenSync: () => void;
  onToggleMobileSidebar?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGroupFilter: string;
  onGroupFilterChange: (group: string) => void;
  allGroups: string[];
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  viewMode,
  onChangeViewMode,
  canvasMode,
  onChangeCanvasMode,
  maxLayers,
  onChangeMaxLayers,
  onOpenNewMemberModal,
  onOpenDashboard,
  onOpenSync,
  onToggleMobileSidebar,
  searchQuery,
  onSearchChange,
  selectedGroupFilter,
  onGroupFilterChange,
  allGroups,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  return (
    <>
      <header className="h-14 px-3 sm:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-2 sm:gap-4 z-40 shrink-0">
        {/* Zone 1: Brand Wordmark & Mobile sidebar trigger */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition"
              title="展開成員名單"
            >
              <Users className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Share2 className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
              NexusNet <span className="font-medium text-slate-400 text-xs sm:text-sm hidden sm:inline">人際關係網</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-300 border border-sky-400/30">
              Beta
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation & View Mode & Display/Edit Mode */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-2xl justify-center">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs shrink-0">
            <button
              onClick={() => onChangeViewMode('force')}
              title="蜘蛛網力導向圖：自由拖曳節點與自動跟隨"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                viewMode === 'force'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden md:inline">蜘蛛網</span>
            </button>
            <button
              onClick={() => onChangeViewMode('radar')}
              title="同心圓層級視圖：按關係親疏遠近同心圓分層"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                viewMode === 'radar'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span className="hidden md:inline">同心圓</span>
            </button>
          </div>

          {/* Mode Switcher: 顯示模式 vs 編輯模式 */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs shrink-0">
            <button
              onClick={() => onChangeCanvasMode('display')}
              title="顯示模式：乾淨純粹的視覺脈絡瀏覽，拖曳單元自動調整跟隨"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                canvasMode === 'display'
                  ? 'bg-emerald-600/90 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>顯示</span>
            </button>
            <button
              onClick={() => onChangeCanvasMode('edit')}
              title="編輯模式：提供連線工具、剪刀切斷連線與關係編輯"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                canvasMode === 'edit'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>編輯</span>
            </button>
          </div>

          {/* Layer Depth selector in TopBar (Hidden on mobile) */}
          <div className="hidden md:flex items-center gap-1 p-0.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs shrink-0">
            <span className="text-[11px] text-slate-400 pl-1.5 flex items-center gap-1">
              <Layers className="w-3 h-3 text-sky-400" />
            </span>
            <button
              onClick={() => onChangeMaxLayers(1)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                maxLayers === 1 ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1層
            </button>
            <button
              onClick={() => onChangeMaxLayers(2)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                maxLayers === 2 ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2層
            </button>
            <button
              onClick={() => onChangeMaxLayers(3)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                maxLayers === 3 ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3層
            </button>
            <button
              onClick={() => onChangeMaxLayers('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                maxLayers === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全部
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-xs hidden xl:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="搜尋姓名、電話、自訂欄位..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-6 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Zone 3: Actions & PWA Install */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Cross-Device Sync Button */}
          <button
            onClick={onOpenSync}
            title="手機、平板與桌機 跨裝置同步（QR Code / 同步碼）"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 text-xs font-semibold border border-sky-500/30 transition shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">跨裝置同步</span>
          </button>

          {/* Dashboard / Telemetry Button */}
          <button
            onClick={onOpenDashboard}
            title="開啟資源與備份儀表板"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">儀表板</span>
          </button>

          {/* PWA Install Button */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">安裝 App</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">iOS 安裝</span>
            </button>
          )}

          {/* Primary Action CTA: Add Member */}
          <button
            onClick={onOpenNewMemberModal}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition shadow-lg shadow-sky-600/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="whitespace-nowrap">新增成員</span>
          </button>
        </div>
      </header>

      {/* iOS Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm">在 iPhone / iPad 上安裝</h3>
              <button onClick={() => setShowIOSModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>在 Safari 瀏覽器底部的工具列點擊「分享」按鈕 (帶向上箭頭的圖示)。</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span>往下滑動並點選「加入主畫面」(Add to Home Screen)。</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span>點擊右上角「新增」，即可像原生 App 一樣全螢幕與離線開啟使用！</span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-xs transition"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
};
