import React, { useState } from 'react';
import { Member, Relationship, CustomField, CustomFieldType, RelationCategory } from '../types';
import { solarToLunar, getBirthdayCountdown } from '../utils/lunarCalendar';
import {
  X,
  Plus,
  Trash2,
  Compass,
  Phone,
  Mail,
  Building,
  GraduationCap,
  Calendar,
  Sparkles,
  Link,
  Edit2,
  UserX,
  ExternalLink,
  Share2,
} from 'lucide-react';

interface MemberDetailDrawerProps {
  member: Member;
  allMembers: Member[];
  relationships: Relationship[];
  isCenter: boolean;
  onClose: () => void;
  onUpdateMember: (updatedMember: Member) => void;
  onDeleteMember: (memberId: string) => void;
  onSetAsCenter: (memberId: string) => void;
  onSelectMember: (memberId: string) => void;
  onSeverRelationship: (relationshipId: string) => void;
  onOpenConnectModal: (sourceId: string) => void;
  onEditRelationship?: (rel: Relationship) => void;
  onEditMemberModal: (member: Member) => void;
}

export const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({
  member,
  allMembers,
  relationships,
  isCenter,
  onClose,
  onUpdateMember,
  onDeleteMember,
  onSetAsCenter,
  onSelectMember,
  onSeverRelationship,
  onOpenConnectModal,
  onEditRelationship,
  onEditMemberModal,
}) => {
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [isConfirmingDeleteMember, setIsConfirmingDeleteMember] = useState(false);
  const [severingRelId, setSeveringRelId] = useState<string | null>(null);

  // Collect all relationships where this member is source or target
  const memberRelationships = relationships.filter(
    (r) => r.sourceId === member.id || r.targetId === member.id
  );

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim() || !newFieldValue.trim()) return;

    const newField: CustomField = {
      id: `f-${Date.now()}`,
      name: newFieldName.trim(),
      type: newFieldType,
      value: newFieldValue.trim(),
    };

    const updated: Member = {
      ...member,
      customFields: [...member.customFields, newField],
      updatedAt: Date.now(),
    };

    onUpdateMember(updated);
    setNewFieldName('');
    setNewFieldValue('');
    setIsAddingField(false);
  };

  const handleDeleteField = (fieldId: string) => {
    const updated: Member = {
      ...member,
      customFields: member.customFields.filter((f) => f.id !== fieldId),
      updatedAt: Date.now(),
    };
    onUpdateMember(updated);
  };

  const renderFieldIcon = (type: CustomFieldType) => {
    switch (type) {
      case 'phone':
        return <Phone className="w-3.5 h-3.5 text-emerald-400" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-sky-400" />;
      case 'company':
        return <Building className="w-3.5 h-3.5 text-purple-400" />;
      case 'education':
        return <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />;
      case 'solar_date':
      case 'lunar_date':
        return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100 overflow-y-auto w-full">
      {/* Header Profile Bar */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0"
            style={{ backgroundColor: member.avatarColor || '#3b82f6' }}
          >
            {isCenter ? '★' : member.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">{member.name}</h2>
              {isCenter && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                  中心主體
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{member.group}</span>
              {member.nickname && (
                <>
                  <span className="text-slate-600">·</span>
                  <span>別名: {member.nickname}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEditMemberModal(member)}
            title="編輯個人基本資訊"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="關閉面板"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Strip */}
      <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <button
          onClick={() => onSetAsCenter(member.id)}
          disabled={isCenter}
          className={`flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg transition ${
            isCenter
              ? 'text-amber-400/50 cursor-default'
              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{isCenter ? '目前網絡核心' : '設為關係網中心'}</span>
        </button>

        <button
          onClick={() => onOpenConnectModal(member.id)}
          className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition"
        >
          <Link className="w-3.5 h-3.5" />
          <span>建立新連線</span>
        </button>
      </div>

      <div className="p-5 space-y-6 flex-1">
        {/* Memo / Notes section if exists */}
        {member.notes && (
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">備註說明</span>
            {member.notes}
          </div>
        )}

        {/* Dynamic Custom Fields Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">個人詳細欄位資料</h3>
            <button
              onClick={() => setIsAddingField(!isAddingField)}
              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingField ? '取消' : '添加欄位'}</span>
            </button>
          </div>

          {/* Add Field Form */}
          {isAddingField && (
            <form onSubmit={handleAddField} className="mb-4 p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">欄位名稱 (例如：國曆生日、公司、學歷、嗜好)</label>
                <input
                  type="text"
                  placeholder="自訂欄位名稱"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">欄位資料格式</label>
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="text">一般文字</option>
                    <option value="phone">電話號碼</option>
                    <option value="email">電子郵件</option>
                    <option value="company">公司 / 職稱</option>
                    <option value="solar_date">國曆日期 / 生日</option>
                    <option value="education">學校 / 學歷</option>
                    <option value="tag">標籤 / 嗜好</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">欄位內容值</label>
                  {newFieldType === 'solar_date' ? (
                    <input
                      type="date"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      required
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="填寫資料內容"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingField(false)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition"
                >
                  儲存欄位
                </button>
              </div>
            </form>
          )}

          {/* Fields List */}
          {member.customFields.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              尚無自訂欄位，可點擊上方「添加欄位」建立生日、電話、經歷等資料。
            </div>
          ) : (
            <div className="space-y-2.5">
              {member.customFields.map((field) => {
                const isDate = field.type === 'solar_date' || field.type === 'lunar_date';
                const lunar = isDate ? solarToLunar(field.value) : null;
                const bday = isDate ? getBirthdayCountdown(field.value) : null;

                return (
                  <div
                    key={field.id}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 transition group"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        {renderFieldIcon(field.type)}
                        <span>{field.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        title="刪除此欄位"
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-200 font-medium">
                      {field.type === 'phone' ? (
                        <a
                          href={`tel:${field.value}`}
                          className="text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          {field.value}
                          <ExternalLink className="w-3 h-3 text-emerald-500/70" />
                        </a>
                      ) : field.type === 'email' ? (
                        <a
                          href={`mailto:${field.value}`}
                          className="text-sky-400 hover:underline flex items-center gap-1"
                        >
                          {field.value}
                          <ExternalLink className="w-3 h-3 text-sky-500/70" />
                        </a>
                      ) : (
                        <span>{field.value}</span>
                      )}
                    </div>

                    {/* Automatic Lunar Calendar & Birthday Calculation Badge */}
                    {isDate && lunar && (
                      <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                        <span className="text-amber-400 font-medium">農曆：{lunar.formattedText}</span>
                        <span>·</span>
                        <span>生肖：{lunar.zodiac}</span>
                        {bday && (
                          <>
                            <span>·</span>
                            <span className={bday.isToday ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                              {bday.isToday ? '🎉 今天生日！' : `生日倒數 ${bday.daysLeft} 天 (${bday.age} 歲)`}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Relationships List Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">
              人際關係網絡鏈 ({memberRelationships.length})
            </h3>
            <button
              onClick={() => onOpenConnectModal(member.id)}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新連結</span>
            </button>
          </div>

          {memberRelationships.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              該成員目前為孤立節點，可點擊「建立新連線」或在畫布中拖曳拉線連結。
            </div>
          ) : (
            <div className="space-y-2">
              {memberRelationships.map((rel) => {
                const otherId = rel.sourceId === member.id ? rel.targetId : rel.sourceId;
                const otherMember = allMembers.find((m) => m.id === otherId);
                if (!otherMember) return null;

                return (
                  <div
                    key={rel.id}
                    className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div
                      onClick={() => onSelectMember(otherMember.id)}
                      className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: otherMember.avatarColor || '#3b82f6' }}
                      >
                        {otherMember.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-200 hover:text-white truncate">
                          {otherMember.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="text-sky-400 font-medium">{rel.label}</span>
                          <span>·</span>
                          <span>{rel.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      {onEditRelationship && (
                        <button
                          onClick={() => onEditRelationship(rel)}
                          title="編輯關係細節"
                          className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {severingRelId === rel.id ? (
                        <div className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-lg border border-red-500/40">
                          <span className="text-[10px] text-red-300">確定切斷？</span>
                          <button
                            onClick={() => {
                              onSeverRelationship(rel.id);
                              setSeveringRelId(null);
                            }}
                            className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-1.5 py-0.5 rounded font-bold"
                          >
                            是
                          </button>
                          <button
                            onClick={() => setSeveringRelId(null)}
                            className="text-[10px] text-slate-400 hover:text-white px-1"
                          >
                            否
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSeveringRelId(rel.id)}
                          title="切斷此連線"
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Member Footer */}
        {!isCenter && (
          <div className="pt-4 border-t border-slate-800">
            {isConfirmingDeleteMember ? (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
                <div className="text-xs text-red-300">
                  確定要刪除成員「<strong className="text-white">{member.name}</strong>」嗎？此操作將同時永久切斷所有關聯連線，無法復原。
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsConfirmingDeleteMember(false)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      onDeleteMember(member.id);
                      onClose();
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
                  >
                    確認刪除
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingDeleteMember(true)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition border border-transparent hover:border-red-500/20"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>刪除此聯絡人單元</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
