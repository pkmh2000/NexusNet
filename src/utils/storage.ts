import { NetworkGraphData, Member, Relationship, BackupPayload } from '../types';

const STORAGE_KEY = 'nexusnet_social_graph_v1';
const CUSTOM_TAGS_KEY = 'nexusnet_custom_relation_tags';

export const DEFAULT_RELATION_TAGS: string[] = [
  '核心夥伴',
  '業務合作',
  '同窗好友',
  '投資人',
  'Mentor',
  '生活摯友',
  '家庭親屬',
  '介紹人',
  '合夥創辦人',
  '同事',
  '舊主管',
  '技術顧問',
  '戰略客戶',
  '夫妻',
  '兄弟姊妹',
];

export function loadCustomRelationTags(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load custom relation tags', err);
    return [];
  }
}

export function saveCustomRelationTags(tags: string[]): void {
  try {
    localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(tags));
  } catch (err) {
    console.error('Failed to save custom relation tags', err);
  }
}

export function addCustomRelationTag(newTag: string): string[] {
  const trimmed = newTag.trim();
  if (!trimmed) return loadCustomRelationTags();
  const current = loadCustomRelationTags();
  if (!current.includes(trimmed) && !DEFAULT_RELATION_TAGS.includes(trimmed)) {
    const updated = [...current, trimmed];
    saveCustomRelationTags(updated);
    return updated;
  }
  return current;
}

export function removeCustomRelationTag(tagToRemove: string): string[] {
  const current = loadCustomRelationTags();
  const updated = current.filter((t) => t !== tagToRemove);
  saveCustomRelationTags(updated);
  return updated;
}

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
    },
    // 2度關係成員 (無與「我」直接連線，由第1層牽線)
    {
      id: 'm-cousin',
      name: '林雅涵 (表妹)',
      nickname: '雅涵',
      avatarColor: '#f43f5e',
      group: '親屬家人',
      customFields: [
        { id: 'f-80', name: '家族脈絡', type: 'text', value: '父親之胞妹長女' },
        { id: 'f-81', name: '任職學校', type: 'company', value: '師大附中國中部英語教師' },
        { id: 'f-82', name: '國曆生日', type: 'solar_date', value: '1995-12-03' }
      ],
      notes: '父親弟弟的女兒，熱衷國際教育交流，逢年過節家族大聚會常見。',
      createdAt: Date.now() - 90 * 86400000,
      updatedAt: Date.now()
    },
    {
      id: 'm-investor-partner',
      name: 'Mark Lee (合夥人)',
      nickname: 'Mark',
      avatarColor: '#d97706',
      group: '商務合作',
      customFields: [
        { id: 'f-90', name: '現任職稱', type: 'company', value: 'Vertex Horizon 矽谷管理總監' },
        { id: 'f-91', name: '常駐城市', type: 'text', value: '舊金山 / 台北' },
        { id: 'f-92', name: '商務信箱', type: 'email', value: 'm.lee@vertexvc.io' }
      ],
      notes: 'Vivian 在美國基金的長期合作主管，專精海外市場落地與 IPO 前融資架構。',
      createdAt: Date.now() - 80 * 86400000,
      updatedAt: Date.now()
    },
    {
      id: 'm-sam-colleague',
      name: 'Alice Wu (設計主管)',
      nickname: 'Alice',
      avatarColor: '#a855f7',
      group: '日常社交',
      customFields: [
        { id: 'f-100', name: '任職公司', type: 'company', value: 'Google 台北 UX Lead' },
        { id: 'f-101', name: '專長領域', type: 'tag', value: 'Design Tokens, 跨平台介面, 產品策略' }
      ],
      notes: 'Sam 在 Google 的直屬設計總監，設計社群大會的常駐講者。',
      createdAt: Date.now() - 60 * 86400000,
      updatedAt: Date.now()
    },
    {
      id: 'm-intern',
      name: '周子軒 (博士生)',
      nickname: '子軒',
      avatarColor: '#0284c7',
      group: '學校學緣',
      customFields: [
        { id: 'f-110', name: '研究題目', type: 'education', value: '大型圖譜神經網路與邊緣計算' },
        { id: 'f-111', name: '指導教授', type: 'text', value: '郭宗德 教授' }
      ],
      notes: '郭教授實驗室主力博士候選人，協助 David (CTO) 進行分散式架構實驗。',
      createdAt: Date.now() - 40 * 86400000,
      updatedAt: Date.now()
    },
    // 3度關係成員 (由第2層牽線，與「我」相隔 3 層)
    {
      id: 'm-global-partner',
      name: 'Lucas Vance (海外商貿)',
      nickname: 'Lucas',
      avatarColor: '#059669',
      group: '商務合作',
      customFields: [
        { id: 'f-120', name: '機構職稱', type: 'company', value: 'Pacific Rim Trade Alliance 亞太總代表' },
        { id: 'f-121', name: '跨國據點', type: 'text', value: '新加坡 / 東京' }
      ],
      notes: 'Mark Lee 在矽谷引薦的跨國渠道夥伴，可作為未來日韓東南亞市場通路顧問。',
      createdAt: Date.now() - 30 * 86400000,
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
    { id: 'r-15', sourceId: 'm-cto', targetId: 'm-friend-sam', label: '產品外包協作舊識', category: '職場', strength: 2, createdAt: Date.now() },

    // 2度關係連線 (與第1層相連，但不與「我」直接相連)
    { id: 'r-20', sourceId: 'm-father', targetId: 'm-cousin', label: '親戚叔姪', category: '親友', strength: 4, createdAt: Date.now() },
    { id: 'r-21', sourceId: 'm-investor', targetId: 'm-investor-partner', label: '基金創投合夥人', category: '商務合作', strength: 5, createdAt: Date.now() },
    { id: 'r-22', sourceId: 'm-friend-sam', targetId: 'm-sam-colleague', label: '設計團隊主管', category: '職場', strength: 4, createdAt: Date.now() },
    { id: 'r-23', sourceId: 'm-advisor-prof', targetId: 'm-intern', label: '指導教授與研究生', category: '學校學緣', strength: 4, createdAt: Date.now() },
    { id: 'r-24', sourceId: 'm-cto', targetId: 'm-intern', label: '技術專案導師', category: '職場', strength: 3, createdAt: Date.now() },

    // 3度關係連線 (由第2層相連，與「我」相隔 3 層)
    { id: 'r-30', sourceId: 'm-investor-partner', targetId: 'm-global-partner', label: '跨國渠道戰略夥伴', category: '商務合作', strength: 4, createdAt: Date.now() }
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
    // If user's stored data has <= 7 members and matches old initial data, upgrade to new multi-tier initial data
    if (parsed.members.length <= 7 && parsed.members.some((m: any) => m.id === 'm-me')) {
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
