export const APP_VERSION = 'v1.0.1-beta';
export const APP_BUILD_DATE = '2026-11-04';

export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  features: string[];
}

export const APP_CHANGELOG: ChangelogItem[] = [
  {
    version: 'v1.0.1-beta',
    date: '2026-11-04',
    title: '版本發布：修復進版檢測與 iOS PWA 快取殘留問題',
    features: [
      '新增真實遠端 version.json 自動比對機制，伺服器一有新版本立即彈窗提醒',
      '新增「一鍵強制清除快取並重整 (Bypass Cache)」按鈕，徹底解決手機 PWA 舊版快取卡死問題',
      '升級版號至 v1.0.1-beta，頂部與功能選單即時同步最新版號',
    ],
  },
  {
    version: 'v1.0.0-beta',
    date: '2026-11-04',
    title: '重大更新：App 內建鏡頭掃碼同步 & PWA 智慧更新機制',
    features: [
      '新增「App 內建鏡頭掃描器」：安裝版 App 直接開啟相機掃描，無需跳轉外部瀏覽器即刻導入圖譜',
      '採用 zlib/pako 高效率壓縮演算法，將完整人際關係網資料壓縮至 1KB 級距，保證 QR Code 清晰易掃',
      '新增「PWA 檢查更新機制」：隨時手動檢查最新 Beta 版本，有新發布時一鍵更新快取重整',
      '優化相機連續自動對焦、中心 480px 採樣與數位變焦，防止近距模糊',
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
];
