import React, { useState, useEffect, useMemo } from 'react';
import { Member, CustomField } from '../types';
import { X, UserPlus, Check, Trash2, AlertTriangle, Calendar, Sparkles } from 'lucide-react';
import { parseFlexibleBirthday, WESTERN_ZODIAC_LIST } from '../utils/lunarCalendar';

interface MemberEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: Partial<Member>) => void;
  onDelete?: (memberId: string) => void;
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
  onDelete,
  initialMember,
}) => {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [group, setGroup] = useState('親屬家人');
  const [avatarColor, setAvatarColor] = useState('#3b82f6');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [birthday, setBirthday] = useState('');
  const [birthdayMode, setBirthdayMode] = useState<'full' | 'month_day' | 'year' | 'zodiac' | 'free'>('full');
  const [notes, setNotes] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setIsConfirmingDelete(false);
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
      const val = bdayField ? bdayField.value : '';
      setBirthday(val);

      if (val) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) setBirthdayMode('full');
        else if (/^\d{1,2}[-/月]\d{1,2}/.test(val)) setBirthdayMode('month_day');
        else if (/^\d{4}/.test(val)) setBirthdayMode('year');
        else if (WESTERN_ZODIAC_LIST.some((z) => val.includes(z.name.slice(0, 2)))) setBirthdayMode('zodiac');
        else setBirthdayMode('free');
      } else {
        setBirthdayMode('full');
      }
    } else {
      setName('');
      setNickname('');
      setGroup('親屬家人');
      setAvatarColor('#3b82f6');
      setPhone('');
      setCompany('');
      setBirthday('');
      setBirthdayMode('full');
      setNotes('');
    }
  }, [initialMember, isOpen]);

  const birthdayPreview = useMemo(() => {
    return parseFlexibleBirthday(birthday);
  }, [birthday]);

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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium">生日 / 星座 / 年次 (選填)</label>
                  <span className="text-[10px] text-slate-500">可僅記月日、年次或星座</span>
                </div>

                {/* Quick Mode Pills */}
                <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setBirthdayMode('full');
                    }}
                    className={`px-2 py-0.5 rounded-lg border transition ${
                      birthdayMode === 'full'
                        ? 'bg-sky-600/30 text-sky-300 border-sky-500/50'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    完整年月日
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBirthdayMode('month_day');
                    }}
                    className={`px-2 py-0.5 rounded-lg border transition ${
                      birthdayMode === 'month_day'
                        ? 'bg-sky-600/30 text-sky-300 border-sky-500/50'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    僅過生日 (月日)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBirthdayMode('year');
                    }}
                    className={`px-2 py-0.5 rounded-lg border transition ${
                      birthdayMode === 'year'
                        ? 'bg-sky-600/30 text-sky-300 border-sky-500/50'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    僅知年次
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBirthdayMode('zodiac');
                    }}
                    className={`px-2 py-0.5 rounded-lg border transition ${
                      birthdayMode === 'zodiac'
                        ? 'bg-sky-600/30 text-sky-300 border-sky-500/50'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    選星座
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBirthdayMode('free');
                    }}
                    className={`px-2 py-0.5 rounded-lg border transition ${
                      birthdayMode === 'free'
                        ? 'bg-sky-600/30 text-sky-300 border-sky-500/50'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    自由輸入
                  </button>
                </div>

                {birthdayMode === 'full' && (
                  <input
                    type="date"
                    value={birthday.match(/^\d{4}-\d{2}-\d{2}$/) ? birthday : ''}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
                  />
                )}

                {birthdayMode === 'month_day' && (
                  <input
                    type="text"
                    placeholder="例如：08-15 或 8月15日 (不需記年份)"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
                  />
                )}

                {birthdayMode === 'year' && (
                  <input
                    type="text"
                    placeholder="例如：1985 或 1990年次"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
                  />
                )}

                {birthdayMode === 'zodiac' && (
                  <select
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
                  >
                    <option value="">請選擇星座...</option>
                    {WESTERN_ZODIAC_LIST.map((z) => (
                      <option key={z.name} value={z.name}>
                        {z.name} {z.symbol} ({z.dateRange})
                      </option>
                    ))}
                  </select>
                )}

                {birthdayMode === 'free' && (
                  <input
                    type="text"
                    placeholder="例如：農曆八月十五、秋天生日、約60幾歲..."
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
                  />
                )}

                {/* Live Analysis Preview Badge */}
                {birthdayPreview && (
                  <div className="mt-1.5 p-2 rounded-lg bg-sky-950/60 border border-sky-500/30 text-[11px] text-sky-300 flex flex-wrap items-center gap-x-2 gap-y-0.5 animate-in fade-in duration-150">
                    <span className="font-semibold text-white">{birthdayPreview.displayTitle}</span>
                    {birthdayPreview.age !== undefined && <span>· {birthdayPreview.age} 歲</span>}
                    {birthdayPreview.zodiacSign && <span>· {birthdayPreview.zodiacSign}</span>}
                    {birthdayPreview.chineseAnimal && <span>· {birthdayPreview.chineseAnimal}</span>}
                    {birthdayPreview.lunarText && <span>· 農曆：{birthdayPreview.lunarText}</span>}
                    {birthdayPreview.daysLeft !== undefined && (
                      <span className={birthdayPreview.isToday ? 'text-emerald-400 font-bold' : 'text-amber-300 font-medium'}>
                        · {birthdayPreview.isToday ? '🎉 今天生日！' : `生日倒數 ${birthdayPreview.daysLeft} 天`}
                      </span>
                    )}
                  </div>
                )}
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

          {/* Confirmation Box for Deletion */}
          {isConfirmingDelete && initialMember && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2 animate-in fade-in duration-150">
              <div className="flex items-start gap-2 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  確定要刪除成員「<strong className="text-white">{initialMember.name}</strong>」嗎？此操作將同時永久切斷所有關聯的人際連線，無法復原。
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDelete && initialMember) {
                      onDelete(initialMember.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-red-600/30 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>確認立即刪除</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-800">
            {initialMember && onDelete && !initialMember.isCenter ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isConfirmingDelete}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除此成員單元</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition font-medium text-xs"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium transition shadow-lg shadow-sky-600/20 text-xs"
              >
                {initialMember ? '更新成員資料' : '確定新增成員'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
