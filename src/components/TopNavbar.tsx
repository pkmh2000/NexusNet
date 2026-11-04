import React, { useState } from 'react';
import { ViewMode, CanvasMode, LayerFilter } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { APP_VERSION } from '../version';
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
  MoreHorizontal,
  SlidersHorizontal,
  Check,
  Camera,
  Rocket,
  GitFork,
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
  onOpenSync: (tab?: 'scan' | 'qr' | 'code' | 'file' | 'version') => void;
  onToggleMobileSidebar?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGroupFilter: string;
  onGroupFilterChange: (group: string) => void;
  allGroups: string[];
  collapsedBranchCount?: number;
  onResetAllCollapsedBranches?: () => void;
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
  collapsedBranchCount = 0,
  onResetAllCollapsedBranches,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);

  return (
    <>
      {/* Top Header: Clean and minimal on mobile (No options, No overflow); Rich on desktop */}
      <header className="h-12 md:h-14 px-3 sm:px-6 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-2 sm:gap-4 z-30 shrink-0 select-none">
        {/* Brand Wordmark (Always visible, uncluttered on mobile) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
              NexusNet
              <span className="font-medium text-slate-400 text-xs sm:text-sm hidden sm:inline ml-1.5">
                人際關係網
              </span>
            </span>
            <button
              onClick={() => onOpenSync('version')}
              title="點擊查看版本記錄與檢查更新"
              className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase font-mono bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-300 border border-sky-400/30 hover:border-sky-400/60 transition cursor-pointer"
            >
              {APP_VERSION}
            </button>
          </div>
        </div>

        {/* Mobile Top Right: Non-intrusive status, strictly NO button options to avoid iOS reachability/notch collision */}
        <div className="md:hidden flex items-center text-xs text-slate-400">
          <span className="text-[11px] text-slate-400/80">人際脈絡管理系統</span>
        </div>

        {/* Desktop Zone 2: Navigation & View Mode & Display/Edit Mode (Hidden on mobile) */}
        <div className="hidden md:flex items-center gap-2 sm:gap-3 flex-1 max-w-2xl justify-center">
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
              <span>蜘蛛網</span>
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
              <span>同心圓</span>
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

          {/* Layer Depth selector in TopBar (Desktop only) */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs shrink-0">
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
              placeholder="搜尋姓名、電話、關係標籤..."
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

        {/* Desktop Zone 3: Actions & PWA Install (Hidden on mobile) */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* In-App Camera Scan Button */}
          <button
            onClick={() => onOpenSync('scan')}
            title="開啟 App 內建鏡頭掃描 QR Code 導入圖譜"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition shadow-sm"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">鏡頭掃碼</span>
          </button>

          {/* Cross-Device Sync Button */}
          <button
            onClick={() => onOpenSync('qr')}
            title="手機、平板與桌機 跨裝置同步（產生條碼 / 代碼）"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 text-xs font-semibold border border-sky-500/30 transition shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">跨裝置同步</span>
          </button>

          {/* Version & Update Button */}
          <button
            onClick={() => onOpenSync('version')}
            title="檢查最新 Beta 更新版本"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 text-xs font-medium border border-amber-500/30 transition"
          >
            <Rocket className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">檢查更新</span>
          </button>

          {/* Dashboard / Telemetry Button */}
          <button
            onClick={onOpenDashboard}
            title="開啟資源與備份儀表板"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">儀表板</span>
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

      {/* MOBILE BOTTOM NAVIGATION DOCK (iOS Ergonomic Thumb Zone) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 px-1 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
        <div className="grid grid-cols-5 items-center gap-0.5 text-center">
          {/* Tab 1: 成員名單 */}
          <button
            onClick={onToggleMobileSidebar}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-300 active:text-sky-400 active:bg-slate-800/80 transition"
          >
            <Users className="w-5 h-5 text-sky-400" />
            <span className="text-[10px] font-medium mt-1 leading-none text-slate-300">
              成員名單
            </span>
          </button>

          {/* Tab 2: 視圖切換 (蜘蛛網 / 同心圓) */}
          <button
            onClick={() => onChangeViewMode(viewMode === 'force' ? 'radar' : 'force')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition active:bg-slate-800/80 ${
              viewMode === 'radar' ? 'text-indigo-400 font-semibold' : 'text-slate-300'
            }`}
            title="點擊切換 蜘蛛網 / 同心圓視圖"
          >
            {viewMode === 'force' ? (
              <Network className="w-5 h-5 text-sky-400" />
            ) : (
              <Disc className="w-5 h-5 text-indigo-400" />
            )}
            <span className="text-[10px] font-medium mt-1 leading-none">
              {viewMode === 'force' ? '蜘蛛網' : '同心圓'}
            </span>
          </button>

          {/* Tab 3: 層級篩選 (1層 / 2層 / 3層 / 全部) */}
          <button
            onClick={() => {
              if (maxLayers === 1) onChangeMaxLayers(2);
              else if (maxLayers === 2) onChangeMaxLayers(3);
              else if (maxLayers === 3) onChangeMaxLayers('all');
              else onChangeMaxLayers(1);
            }}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-300 active:bg-slate-800/80 transition"
            title="點擊切換顯示層級"
          >
            <Layers className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-medium mt-1 leading-none">
              {maxLayers === 'all' ? '全部層級' : `${maxLayers} 層關係`}
            </span>
          </button>

          {/* Tab 4: 畫布模式 (顯示 / 編輯) */}
          <button
            onClick={() => onChangeCanvasMode(canvasMode === 'display' ? 'edit' : 'display')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition active:bg-slate-800/80 ${
              canvasMode === 'edit' ? 'text-amber-400 font-semibold' : 'text-slate-300'
            }`}
            title="點擊切換 顯示模式 / 編輯連線模式"
          >
            {canvasMode === 'display' ? (
              <Eye className="w-5 h-5 text-emerald-400" />
            ) : (
              <Edit3 className="w-5 h-5 text-amber-400" />
            )}
            <span className="text-[10px] font-medium mt-1 leading-none">
              {canvasMode === 'display' ? '顯示模式' : '編輯模式'}
            </span>
          </button>

          {/* Tab 5: 功能選單 */}
          <button
            onClick={() => setShowMobileActionSheet(true)}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-300 active:text-white active:bg-slate-800/80 transition"
          >
            <MoreHorizontal className="w-5 h-5 text-slate-300" />
            <span className="text-[10px] font-medium mt-1 leading-none text-slate-300">
              功能選單
            </span>
          </button>
        </div>
      </nav>

      {/* MOBILE ACTION SHEET (Bottom Drawer for Add Member, Sync, Dashboard, Search, PWA) */}
      {showMobileActionSheet && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setShowMobileActionSheet(false)}
          />

          {/* Action Sheet Panel */}
          <div className="relative w-full bg-slate-900 border-t border-slate-700/80 rounded-t-3xl p-4 sm:p-5 shadow-2xl z-50 max-h-[85vh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom duration-250">
            {/* Sheet Handle */}
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-sm text-white">NexusNet 功能選單</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 font-mono">
                  {APP_VERSION}
                </span>
              </div>
              <button
                onClick={() => setShowMobileActionSheet(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-App Camera Scan Quick CTA (User Requested: app 內開啟收 QR code 導入資料) */}
            <div className="pt-3 pb-1">
              <button
                onClick={() => {
                  setShowMobileActionSheet(false);
                  onOpenSync('scan');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition active:scale-[0.98]"
              >
                <Camera className="w-4 h-4" />
                <span>📷 鏡頭掃碼導入圖譜 (免開瀏覽器)</span>
              </button>
            </div>

            {/* Primary Action: Add Member */}
            <div className="py-1">
              <button
                onClick={() => {
                  setShowMobileActionSheet(false);
                  onOpenNewMemberModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>新增人物單元</span>
              </button>
            </div>

            {/* Collapsed Branches Quick Reset in Mobile Menu */}
            {collapsedBranchCount > 0 && onResetAllCollapsedBranches && (
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowMobileActionSheet(false);
                    onResetAllCollapsedBranches();
                  }}
                  className="w-full flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-amber-400" />
                    <span>已折疊 {collapsedBranchCount} 位成員對外鏈</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[11px] font-bold">
                    全部取消折疊
                  </span>
                </button>
              </div>
            )}

            {/* Search Input */}
            <div className="py-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                全域搜尋 (姓名、電話、自訂欄位、關係)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="搜尋成員姓名、電話、自訂欄位、關係標籤..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Group Categories */}
            {allGroups.length > 0 && (
              <div className="py-2">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  群組分類篩選
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  <button
                    onClick={() => onGroupFilterChange('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      selectedGroupFilter === 'all'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    全部群組
                  </button>
                  {allGroups.map((g) => (
                    <button
                      key={g}
                      onClick={() => onGroupFilterChange(g)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        selectedGroupFilter === g
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Layer Depth Quick Picker */}
            <div className="py-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                顯示關係層級
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: 1, label: '1 層關係' },
                  { key: 2, label: '2 層關係' },
                  { key: 3, label: '3 層關係' },
                  { key: 'all', label: '全部脈絡' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => onChangeMaxLayers(item.key as LayerFilter)}
                    className={`py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1 transition ${
                      maxLayers === item.key
                        ? 'bg-sky-600/20 border-sky-500/50 text-sky-300 font-bold'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {maxLayers === item.key && <Check className="w-3 h-3 text-sky-400" />}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Utility Grid: Sync, Dashboard, Version Update */}
            <div className="pt-3 pb-1 border-t border-slate-800/80 space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                資料與管理功能
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* Sync */}
                <button
                  onClick={() => {
                    setShowMobileActionSheet(false);
                    onOpenSync('qr');
                  }}
                  className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-sky-500/30 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-950/80 flex items-center justify-center text-sky-400 mb-1">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-200">跨裝置同步</div>
                  <div className="text-[9px] text-slate-400">條碼 / 代碼</div>
                </button>

                {/* Dashboard */}
                <button
                  onClick={() => {
                    setShowMobileActionSheet(false);
                    onOpenDashboard();
                  }}
                  className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-950/60 flex items-center justify-center text-indigo-400 mb-1">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-200">數據與備份</div>
                  <div className="text-[9px] text-slate-400">JSON 匯出</div>
                </button>

                {/* Version Update */}
                <button
                  onClick={() => {
                    setShowMobileActionSheet(false);
                    onOpenSync('version');
                  }}
                  className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-amber-500/30 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-950/60 flex items-center justify-center text-amber-400 mb-1">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-200">檢查更新</div>
                  <div className="text-[9px] text-amber-400 font-mono">{APP_VERSION}</div>
                </button>
              </div>

              {/* Install PWA Option */}
              {!isInstalled && (
                <div className="pt-1">
                  {isIOS ? (
                    <button
                      onClick={() => {
                        setShowMobileActionSheet(false);
                        setShowIOSModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>查看 iOS 加入主畫面安裝教學</span>
                    </button>
                  ) : isInstallable ? (
                    <button
                      onClick={() => {
                        setShowMobileActionSheet(false);
                        install();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      <span>安裝為手機應用程式 (PWA)</span>
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
