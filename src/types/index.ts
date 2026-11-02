export type CustomFieldType =
  | 'text'
  | 'phone'
  | 'email'
  | 'company'
  | 'solar_date'
  | 'lunar_date'
  | 'education'
  | 'tag'
  | 'link'
  | 'note';

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  value: string;
}

export type RelationCategory = '親友' | '職場' | '社交' | '商務合作' | '學校學緣' | '其他';

export interface Member {
  id: string;
  name: string;
  nickname?: string;
  avatarColor: string;
  group: string; // e.g., '核心自己' | '親屬家人' | '核心好友' | '創業夥伴' | '商務客戶' | '社團學長姐'
  isCenter?: boolean; // Mark as primary user
  customFields: CustomField[];
  notes?: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  label: string; // e.g., '夫妻', '合夥人', '高中同窗', '專案PM', '介紹人'
  category: RelationCategory;
  strength: number; // 1 to 5 (affects visual line weight and spring distance)
  notes?: string;
  createdAt: number;
}

export interface NetworkGraphData {
  members: Member[];
  relationships: Relationship[];
}

export type ViewMode = 'force' | 'radar';

export type CanvasMode = 'display' | 'edit';

export type LayerFilter = 1 | 2 | 3 | 'all';

export interface BackupPayload {
  version: string;
  appName: string;
  exportedAt: string;
  network: NetworkGraphData;
}
