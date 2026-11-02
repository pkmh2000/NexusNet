import React, { useState, useEffect } from 'react';
import { Member, CustomField } from '../types';
import { X, UserPlus, Check } from 'lucide-react';

interface MemberEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: Partial<Member>) => void;
  initialMember?: Member | null;
}

const PRESET_GROUPS = ['親屬家人', '核心好友', '創業夥伴', '商務合作', '學校學緣', '社團交流', '日常社交'];

const PRESET_COLORS = [
  '#3b82f6', // Sky Blue
  '#10b981', // Emerald Green
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export const MemberEditModal: React.FC<MemberEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMember,
}) => {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [group, setGroup] = useState('親屬家人');
  const [avatarColor, setAvatarColor] = useState('#3b82f6');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialMember) {
      setName(initialMember.name || '');
      setNickname(initialMember.nickname || '');
      setGroup(initialMember.group || '親屬家人');
      setAvatarColor(initialMember.avatarColor || '#3b82f6');
      setNotes(initialMember.notes || '');

      const phoneField = initialMember.customFields?.find((f) => f.type === 'phone');
      setPhone(phoneField ? phoneField.value : '');

      const companyField = initialMember.customFields?.find((f) => f.type === 'company');
      setCompany(companyField ? companyField.value : '');

      const bdayField = initialMember.customFields?.find((f) => f.type === 'solar_date' || f.type === 'lunar_date');
      setBirthday(bdayField ? bdayField.value : '');
    } else {
      setName('');
      setNickname('');
      setGroup('親屬家人');
      setAvatarColor('#3b82f6');
      setPhone('');
      setCompany('');
      setBirthday('');
      setNotes('');
    }
  }, [initialMember, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Build or preserve custom fields
    const customFields: CustomField[] = initialMember ? [...initialMember.customFields] : [];

    const upsertField = (fieldName: string, fieldType: any, val: string) => {
      const idx = customFields.findIndex((f) => f.name === fieldName || f.type === fieldType);
      if (val.trim()) {
        if (idx >= 0) {
          customFields[idx] = { ...customFields[idx], value: val.trim() };
        } else {
          customFields.push({
            id: `f-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: fieldName,
            type: fieldType,
            value: val.trim(),
          });
        }
      } else if (idx >= 0 && !initialMember) {
        customFields.splice(idx, 1);
      }
    };

    if (phone) upsertField('連絡電話', 'phone', phone);
    if (company) upsertField('現任職位/機構', 'company', company);
    if (birthday) upsertField('出生年月日', 'solar_date', birthday);

    onSave({
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      group,
      avatarColor,
      notes: notes.trim() || undefined,
      customFields,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              {initialMember ? '編輯成員單元資訊' : '新增人際網絡成員'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              姓名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="請輸入姓名 (如：林曉峰 / Sarah Chen)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">別名 / 簡稱</label>
              <input
                type="text"
                placeholder="例如：老林 / Alex"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">關係分組</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {PRESET_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Color tag */}
          <div>
            <label className="block font-medium text-slate-300 mb-1.5">節點識別顏色</label>
            <div className="flex items-center gap-2.5">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition ring-offset-2 ring-offset-slate-900"
                  style={{ backgroundColor: c }}
                >
                  {avatarColor === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <span className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              常用快捷欄位 (後續亦可在詳細頁自由添加)
            </span>

            <div className="space-y-2.5">
              <div>
                <label className="block text-slate-400 mb-1">連絡電話</label>
                <input
                  type="text"
                  placeholder="+886 912-345-678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">任職公司 / 職位</label>
                <input
                  type="text"
                  placeholder="例如：台積電 資深架構師"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">出生年月日 (支援自動計算農曆與生肖)</label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">備忘說明</label>
                <textarea
                  rows={2}
                  placeholder="認識管道、重要偏好或交往歷程備註..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 transition font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium transition shadow-lg shadow-sky-600/20"
            >
              {initialMember ? '更新成員資料' : '確定新增成員'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
