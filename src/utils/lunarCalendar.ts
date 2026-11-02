/**
 * 農曆與國曆雙向換算、生肖與生日計算演算法
 */

// 農曆年資訊編碼表 (1920 ~ 2050 年)
// 每 16 進位整數代表該農曆年各月大小及閏月：
// 前 4 位元表示閏月大小（1 為大月 30 天，0 為小月 29 天）
// 中間 12 位元表示 1~12 月大小（1 為大月 30 天，0 為小月 29 天）
// 最後 4 位元表示閏哪個月（0 為無閏月）
const LUNAR_INFO: number[] = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1920-1929
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1930-1939
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1940-1949
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1950-1959
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1960-1969
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0, // 1970-1979
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1980-1989
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6, // 1990-1999
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 2000-2009
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, // 2010-2019
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2020-2029
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2030-2039
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530  // 2040-2049
];

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ANIMALS = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
const CHINESE_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '臘'];
const CHINESE_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

// 計算農曆年的總天數
function getLunarYearDays(year: number): number {
  const info = LUNAR_INFO[year - 1920];
  if (!info) return 365;
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (info & i) ? 1 : 0;
  }
  return sum + getLeapMonthDays(year);
}

// 取得閏哪個月，0 表示無閏月
function getLeapMonth(year: number): number {
  const info = LUNAR_INFO[year - 1920];
  return info ? (info & 0xf) : 0;
}

// 取得閏月天數
function getLeapMonthDays(year: number): number {
  if (getLeapMonth(year)) {
    const info = LUNAR_INFO[year - 1920];
    return (info & 0x10000) ? 30 : 29;
  }
  return 0;
}

// 取得農曆特定月份天數
function getLunarMonthDays(year: number, month: number): number {
  const info = LUNAR_INFO[year - 1920];
  if (!info) return 30;
  return (info & (0x10000 >> month)) ? 30 : 29;
}

export interface LunarDateResult {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeap: boolean;
  yearGanZhi: string;
  zodiac: string;
  lunarText: string;
  formattedText: string;
}

/**
 * 國曆轉農曆
 * @param dateStr 格式 'YYYY-MM-DD'
 */
export function solarToLunar(dateStr: string): LunarDateResult | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  const [sYear, sMonth, sDay] = parts;
  if (sYear < 1920 || sYear > 2049) {
    // 超出計算範圍時給予基礎備用標籤
    return {
      lunarYear: sYear,
      lunarMonth: sMonth,
      lunarDay: sDay,
      isLeap: false,
      yearGanZhi: '',
      zodiac: ANIMALS[(sYear - 4) % 12] || '',
      lunarText: `${sMonth}月${sDay}日`,
      formattedText: `${sYear}年${sMonth}月${sDay}日`
    };
  }

  // 1920-01-31 為農曆 1920 年正月初十
  const baseDate = new Date(1920, 0, 31);
  const targetDate = new Date(sYear, sMonth - 1, sDay);
  let offset = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);

  let lYear = 1920;
  let daysInYear = getLunarYearDays(lYear);
  while (lYear < 2050 && offset >= daysInYear) {
    offset -= daysInYear;
    lYear++;
    daysInYear = getLunarYearDays(lYear);
  }

  let isLeap = false;
  const leapMonth = getLeapMonth(lYear);
  let lMonth = 1;

  for (let m = 1; m <= 12; m++) {
    const daysInMonth = getLunarMonthDays(lYear, m);
    if (offset < daysInMonth) {
      lMonth = m;
      break;
    }
    offset -= daysInMonth;

    if (m === leapMonth) {
      const leapDays = getLeapMonthDays(lYear);
      if (offset < leapDays) {
        lMonth = m;
        isLeap = true;
        break;
      }
      offset -= leapDays;
    }
  }

  const lDay = offset + 1;
  const ganIndex = (lYear - 4) % 10;
  const zhiIndex = (lYear - 4) % 12;
  const yearGanZhi = `${GAN[ganIndex]}${ZHI[zhiIndex]}`;
  const zodiac = ANIMALS[zhiIndex];

  const monthName = (isLeap ? '閏' : '') + CHINESE_MONTHS[lMonth - 1] + '月';
  const dayName = CHINESE_DAYS[lDay - 1] || `${lDay}日`;
  const lunarText = `${monthName}${dayName}`;
  const formattedText = `${yearGanZhi}${zodiac}年 ${lunarText}`;

  return {
    lunarYear: lYear,
    lunarMonth: lMonth,
    lunarDay: lDay,
    isLeap,
    yearGanZhi,
    zodiac,
    lunarText,
    formattedText
  };
}

/**
 * 計算距離下一次生日倒數天數（支援國曆生日 YYYY-MM-DD）
 */
export function getBirthdayCountdown(dateStr: string): { daysLeft: number; isToday: boolean; age: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return null;
  const [bYear, bMonth, bDay] = parts;

  const now = new Date();
  const currentYear = now.getFullYear();

  let nextBirthday = new Date(currentYear, bMonth - 1, bDay);
  const today = new Date(currentYear, now.getMonth(), now.getDate());

  if (nextBirthday.getTime() < today.getTime()) {
    nextBirthday = new Date(currentYear + 1, bMonth - 1, bDay);
  }

  const diffTime = nextBirthday.getTime() - today.getTime();
  const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const age = nextBirthday.getFullYear() - bYear;

  return {
    daysLeft,
    isToday: daysLeft === 0,
    age
  };
}
