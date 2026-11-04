export const APP_VERSION = 'v1.0.0-beta';
export const APP_BUILD_DATE = '2026-11-04';

export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  features: string[];
}

export const APP_CHANGELOG: ChangelogItem[] = [
  {
    version: 'v1.0.0-beta',
    date: '2026-11-04',
    title: '重大更新：App 內建鏡頭掃碼同步 & PWA 智慧更新機制',
    features: [
      '新增「App 內建鏡頭掃描器」：安裝版 App 直接開啟相機掃描，無需跳轉外部瀏覽器即刻導入圖譜',
      '採用 zlib/pako 高效率壓縮演算法，將完整人際關係網資料壓縮至 1KB 級距，保證 QR Code 清晰易掃',
      '新增「PWA 檢查更新機制」：隨時手動檢查最新 Beta 版本，有新發布時一鍵更新快取重整',
      '版號全面升級為 v1.0.0-beta，介面顯示版本徽章與更新記錄',
    ],
  },
  {
    version: 'v0.9.8-beta',
    date: '2026-11-03',
    title: '手機介面人體工學改版與安全邊距優化',
    features: [
      '手機頂部無按鈕純淨化，防止 iOS 瀏海／動態島碰撞',
      '全新 iOS 拇指底部操作列：成員、視圖、層級、模式與功能選單',
      '修復關係緊密度物理連線動態間距與星級渲染',
    ],
  },
  {
    version: 'v0.9.5-beta',
    date: '2026-11-02',
    title: '多層同心圓與自由力導向雙重視圖',
    features: [
      '支援自由拖曳蜘蛛網與同心圓層級脈絡切換',
      '關係層級 1層/2層/3層/全部 動態篩選',
      '自訂關係標籤、農曆國曆換算與資料搜尋',
    ],
  },
];
