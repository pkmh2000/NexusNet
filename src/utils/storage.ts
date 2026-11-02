import { NetworkGraphData, Member, Relationship, BackupPayload } from '../types';

const STORAGE_KEY = 'nexusnet_social_graph_v1';

export const INITIAL_DATA: NetworkGraphData = {
  members: [
    {
      id: 'm-me',
      name: '我 (Alex Lin)',
      nickname: 'Alex',
      avatarColor: '#3b82f6',
      group: '核心自己',
      isCenter: true,
      customFields: [
        { id: 'f-1', name: '身分定位', type: 'text', value: '軟體架構師 / 科技新創創辦人' },
        { id: 'f-2', name: '國曆生日', type: 'solar_date', value: '1992-06-18' },
        { id: 'f-3', name: '連絡電話', type: 'phone', value: '+886 912-345-678' },
        { id: 'f-4', name: '電子郵件', type: 'email', value: 'alex.lin@nexus.tech' },
        { id: 'f-5', name: '現任公司', type: 'company', value: 'Nexus Dynamics Lab' },
        { id: 'f-6', name: '最高學歷', type: 'education', value: '台灣大學資訊工程學系' },
        { id: 'f-7', name: '核心興趣', type: 'tag', value: 'AI Agent, 攀岩, 咖啡手沖' }
      ],
      notes: '個人社交網絡的原始樞紐點。掌控各領域朋友、合作夥伴與家人的樞紐。',
      createdAt: Date.now() - 365 * 86400000,
      updatedAt: Date.now()
    },
    {
      id: 'm-father',
      name: '林建國 (父親)',
      nickname: '老爸',
      avatarColor: '#0ea5e9',
      group: '親屬家人',
      customFields: [
        { id: 'f-10', name: '稱謂', type: 'text', value: '父親' },
        { id: 'f-11', name: '農曆生日', type: 'solar_date', value: '1963-04-12' },
        { id: 'f-12', name: '連絡電話', type: 'phone', value: '+886 933-112-233' },
        { id: 'f-13', name: '曾任職位', type: 'company', value: '台塑石化資深工程督導 (已退休)' },
        { id: 'f-14', name: '喜好', type: 'tag', value: '高爾夫, 園藝茶道' }
      ],
      notes: '常居高雄，每月第三個週末家族聚會。',
      createdAt: Date.now() - 300 * 86400000,
      updatedAt: Date.now()
    },
    {
      id: 'm-mother',
      name: '陳素芬 (母親)',
      nickname: '媽媽',
      avatarColor: '#ec4899',
      group: '親屬家人',
      customFields: [
        { id: 'f-20', name: '稱謂', type: 'text', value: '母親' },
        { id: 'f-21', name: '國曆生日', type: 'solar_date', value: '1966-10-25' },
        { id: 'f-22', name: '連絡電話', type: 'phone', value: '+886 928-887-766' },
        { id: 'f-23', name: '經歷', type: 'company', value: '市立圖書館文化志工隊長' },
        { id: 'f-24', name: '專長', type: 'tag', value: '烘焙, 瑜伽' }
      ],
      notes: '提醒每週日晚間固定視訊聯絡。',
      createdAt: Date.now() - 300 * 86400000,
      updatedAt: Date.now()
    },
    {
      id: 'm-cto',
      name: '張維哲 (David)',
      nickname: 'David',
      avatarColor: '#8b5cf6',
      group: '創業夥伴',
      customFields: [
        { id: 'f-30', name: '公司職稱', type: 'company', value: '共同創辦人 & CTO' },
        { id: 'f-31', name: '國曆生日', type: 'solar_date', value: '1991-03-08' },
        { id: 'f-32', name: '電話', type: 'phone', value: '+886 955-432-109' },
        { id: 'f-33', name: '電子郵件', type: 'email', value: 'david.chang@nexus.tech' },
        { id: 'f-34', name: '學歷背景', type: 'education', value: '台大資工所碩士' },
        { id: 'f-35', name: '技術棧', type: 'tag', value: 'Rust, Distributed Systems, WebGPU' }
      ],
      notes: '台大資工所同窗，創業最重要的技術基石，思維嚴謹敏捷。',
      createdAt: Date.now() - 250 * 86400000,
      updatedAt: Date.now()
    },
    {
      id: 'm-investor',
      name: '何詠晴 (Vivian)',
      nickname: 'Vivian',
      avatarColor: '#f59e0b',
      group: '商務合作',
      customFields: [
        { id: 'f-40', name: '任職機構', type: 'company', value: 'Vertex Horizon 創投合夥人' },
        { id: 'f-41', name: '國曆生日', type: 'solar_date', value: '1985-11-04' },
        { id: 'f-42', name: '商務信箱', type: 'email', value: 'v.ho@vertexvc.io' },
        { id: 'f-43', name: '主投領域', type: 'tag', value: 'SaaS, GenAI Infra, Web3' },
        { id: 'f-44', name: '畢業學校', type: 'education', value: 'Stanford GSB MBA' }
      ],
      notes: '種子輪主投領投人，每季董事會例會，對市場拓展有深度洞見。',
      createdAt: Date.now() - 180 * 86400000,
      updatedAt: Date.now()
    },
    {
      id: 'm-friend-sam',
      name: '黃柏翰 (Sam)',
      nickname: 'Sam',
      avatarColor: '#10b981',
      group: '核心好友',
      customFields: [
        { id: 'f-50', name: '結識脈絡', type: 'text', value: '建中高中同班同學' },
        { id: 'f-51', name: '國曆生日', type: 'solar_date', value: '1992-08-30' },
        { id: 'f-52', name: '任職公司', type: 'company', value: 'Google 台灣 Senior Designer' },
        { id: 'f-53', name: '電話', type: 'phone', value: '+886 918-765-432' },
        { id: 'f-54', name: '共同話題', type: 'tag', value: '設計系統, 公路車, 攝影' }
      ],
      notes: '十多年無話不談的好友，產品 UI/UX 的私人諮詢智囊。',
      createdAt: Date.now() - 320 * 86400000,
      updatedAt: Date.now()
    },
    {
      id: 'm-advisor-prof',
      name: '郭宗德 教授',
      nickname: '郭副院長',
      avatarColor: '#6366f1',
      group: '學校學緣',
      customFields: [
        { id: 'f-60', name: '現任教職', type: 'company', value: '台大資工特聘教授 / 智財智庫顧問' },
        { id: 'f-61', name: '農曆生日', type: 'solar_date', value: '1960-09-15' },
        { id: 'f-62', name: '研究領域', type: 'education', value: '分散式資料庫與圖形理論' },
        { id: 'f-63', name: '信箱', type: 'email', value: 'tdkuo@csie.ntu.edu.tw' }
      ],
      notes: '碩士論文指導教授，亦是介紹天使投資人 Vivian 的重要貴人。',
      createdAt: Date.now() - 280 * 86400000,
      updatedAt: Date.now()
    },
    {
      id: 'm-client-eva',
      name: '趙敏君 (Eva)',
      nickname: 'Eva',
      avatarColor: '#14b8a6',
      group: '商務合作',
      customFields: [
        { id: 'f-70', name: '公司與職稱', type: 'company', value: '智邦科技數位轉型副總經理' },
        { id: 'f-71', name: '商務電話', type: 'phone', value: '+886 2-2789-0123' },
        { id: 'f-72', name: '國曆生日', type: 'solar_date', value: '1988-07-22' },
        { id: 'f-73', name: '專案代號', type: 'text', value: 'Project Titan 企業授權案' }
      ],
      notes: '重要旗艦企業客戶主管，曾由 Sam 在科技設計年會上牽線認識。',
      createdAt: Date.now() - 100 * 86400000,
      updatedAt: Date.now()
    }
  ],
  relationships: [
    // 與「我」的直接連線 (1度關係)
    { id: 'r-1', sourceId: 'm-me', targetId: 'm-father', label: '父子', category: '親友', strength: 5, createdAt: Date.now() },
    { id: 'r-2', sourceId: 'm-me', targetId: 'm-mother', label: '母子', category: '親友', strength: 5, createdAt: Date.now() },
    { id: 'r-3', sourceId: 'm-me', targetId: 'm-cto', label: '合夥創辦人', category: '職場', strength: 5, createdAt: Date.now() },
    { id: 'r-4', sourceId: 'm-me', targetId: 'm-investor', label: '投資人 & 董事', category: '商務合作', strength: 4, createdAt: Date.now() },
    { id: 'r-5', sourceId: 'm-me', targetId: 'm-friend-sam', label: '高中摯友', category: '社交', strength: 4, createdAt: Date.now() },
    { id: 'r-6', sourceId: 'm-me', targetId: 'm-advisor-prof', label: '碩士指導教授', category: '學校學緣', strength: 4, createdAt: Date.now() },
    { id: 'r-7', sourceId: 'm-me', targetId: 'm-client-eva', label: '戰略採購客戶', category: '商務合作', strength: 3, createdAt: Date.now() },

    // 成員之間的交錯關係 (多層次交織網絡)
    { id: 'r-10', sourceId: 'm-father', targetId: 'm-mother', label: '夫妻', category: '親友', strength: 5, createdAt: Date.now() },
    { id: 'r-11', sourceId: 'm-cto', targetId: 'm-advisor-prof', label: '同一研究室同門', category: '學校學緣', strength: 4, createdAt: Date.now() },
    { id: 'r-12', sourceId: 'm-advisor-prof', targetId: 'm-investor', label: '學術專利諮詢顧問', category: '商務合作', strength: 4, createdAt: Date.now() },
    { id: 'r-13', sourceId: 'm-cto', targetId: 'm-investor', label: '技術盡職調查彙報', category: '職場', strength: 3, createdAt: Date.now() },
    { id: 'r-14', sourceId: 'm-friend-sam', targetId: 'm-client-eva', label: '設計社群年會引薦人', category: '社交', strength: 3, createdAt: Date.now() },
    { id: 'r-15', sourceId: 'm-cto', targetId: 'm-friend-sam', label: '產品外包協作舊識', category: '職場', strength: 2, createdAt: Date.now() }
  ]
};

export function loadNetwork(): NetworkGraphData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveNetwork(INITIAL_DATA);
      return INITIAL_DATA;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.members || !Array.isArray(parsed.members) || !parsed.relationships) {
      saveNetwork(INITIAL_DATA);
      return INITIAL_DATA;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load network from localStorage, falling back to initial data', err);
    return INITIAL_DATA;
  }
}

export function saveNetwork(data: NetworkGraphData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save network to localStorage', err);
  }
}

export function exportBackupJson(data: NetworkGraphData): void {
  const payload: BackupPayload = {
    version: '1.0.0',
    appName: 'NexusNet 人際關係網',
    exportedAt: new Date().toISOString(),
    network: data
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  link.href = url;
  link.download = `NexusNet_Backup_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importBackupJson(jsonString: string): NetworkGraphData {
  const parsed = JSON.parse(jsonString);
  const data = parsed.network || parsed;
  if (!data.members || !Array.isArray(data.members) || !data.relationships) {
    throw new Error('無效的備份檔案格式：缺少 members 或 relationships 欄位');
  }
  saveNetwork(data);
  return data;
}
