export const APP_VERSION = 'v1.0.2-beta';
export const APP_BUILD_DATE = '2026-11-04';

export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  features: string[];
}

export const APP_CHANGELOG: ChangelogItem[] = [
  {
    version: 'v1.0.2-beta',
    date: '2026-11-04',
    title: '重大優化：極致「有感」同步接收體驗 & 照片/剪貼簿解析修復',
    features: [
      '取景框新增高科技「動態上下雷射掃描光束」，掃描與對焦進度一目了然',
      '掃碼/貼上/照片解析成功後，強制彈出「確認套用」卡片，詳細對比雙端成員與關係數量，再也不會迷失！',
      '明確提供「完全覆蓋 (推薦)」與「智慧合併」二選一單選卡片，確認後一鍵套用',
      '修復「選照片辨識」：修正二進位圖片 DataURL 讀取與高畫質相片多尺度降採樣，相簿 QR 碼完美解析',
      '優化「讀取剪貼簿秒速導入」：直接解析剪貼簿並帶出確認視窗，不再跳轉代碼頁面造成困惑',
      '套用成功伴隨彩帶紙花與觸覺震動回饋，自動關閉彈窗並切換至最新圖譜畫布',
    ],
  },
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
