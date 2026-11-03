import React, { useState, useEffect, useMemo } from 'react';
import { Member, Relationship, RelationCategory } from '../types';
import {
  X,
  Link2,
  Sparkles,
  Search,
  ArrowRightLeft,
  Trash2,
  Check,
  Plus,
  Tag,
  Users,
  AlertTriangle,
} from 'lucide-react';
import {
  DEFAULT_RELATION_TAGS,
  loadCustomRelationTags,
  addCustomRelationTag,
  removeCustomRelationTag,
} from '../utils/storage';

interface RelationshipModalProps {
  isOpen: boolean;
  sourceId: string | null;
  targetId: string | null;
  allMembers: Member[];
  editingRelationship?: Relationship | null;
  onClose: () => void;
  onSave: (relData: {
    sourceId: string;
    targetId: string;
    label: string;
    category: RelationCategory;
    strength: number;
    notes?: string;
  }) => void;
  onDeleteRelationship?: (relationshipId: string) => void;
}

const CATEGORIES: RelationCategory[] = ['親友', '職場', '社交', '商務合作', '學校學緣', '其他'];

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  sourceId: initialSourceId,
  targetId: initialTargetId,
  allMembers,
  editingRelationship,
  onClose,
  onSave,
  onDeleteRelationship,
}) => {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<RelationCategory>('職場');
  const [strength, setStrength] = useState(4);
  const [notes, setNotes] = useState('');

  // Target member search state
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [targetGroupFilter, setTargetGroupFilter] = useState('all');

  // Custom tags management
  const [customTags, setCustomTags] = useState<string[]>(() => loadCustomRelationTags());
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Sync state on open or change
  useEffect(() => {
    if (!isOpen) return;
    setIsConfirmingDelete(false);

    // Refresh custom tags from localStorage
    setCustomTags(loadCustomRelationTags());

    if (editingRelationship) {
      // Edit mode: pre-fill existing relationship details
      setSourceId(editingRelationship.sourceId);
      setTargetId(editingRelationship.targetId);
      setLabel(editingRelationship.label || '');
      setCategory(editingRelationship.category || '職場');
      setStrength(editingRelationship.strength || 3);
      setNotes(editingRelationship.notes || '');
    } else {
      // Create mode
      if (initialSourceId) setSourceId(initialSourceId);
      else if (allMembers.length > 0) setSourceId(allMembers[0].id);

      if (initialTargetId) setTargetId(initialTargetId);
      else if (allMembers.length > 1) {
        const other = allMembers.find((m) => m.id !== (initialSourceId || allMembers[0].id));
        if (other) setTargetId(other.id);
      }

      setLabel('');
      setCategory('職場');
      setStrength(4);
      setNotes('');
    }

    setTargetSearchQuery('');
    setTargetGroupFilter('all');
    setIsAddingCustomTag(false);
    setNewTagInput('');
  }, [isOpen, editingRelationship, initialSourceId, initialTargetId, allMembers]);

  // Derived list of groups
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    allMembers.forEach((m) => {
      if (m.group) set.add(m.group);
    });
    return Array.from(set);
  }, [allMembers]);

  // Filtered target members according to search & group
  const filteredTargetCandidates = useMemo(() => {
    const q = targetSearchQuery.trim().toLowerCase();
    return allMembers.filter((m) => {
      if (m.id === sourceId) return false; // Cannot connect to self
      if (targetGroupFilter !== 'all' && m.group !== targetGroupFilter) return false;
      if (!q) return true;

      const nameMatch = m.name?.toLowerCase().includes(q);
      const nickMatch = m.nickname?.toLowerCase().includes(q);
      const groupMatch = m.group?.toLowerCase().includes(q);
      const notesMatch = m.notes?.toLowerCase().includes(q);
      const fieldsMatch = m.customFields?.some(
        (f) => f.name?.toLowerCase().includes(q) || f.value?.toLowerCase().includes(q)
      );
      return nameMatch || nickMatch || groupMatch || notesMatch || fieldsMatch;
    });
  }, [allMembers, sourceId, targetGroupFilter, targetSearchQuery]);

  const sourceMember = useMemo(
    () => allMembers.find((m) => m.id === sourceId),
    [allMembers, sourceId]
  );
  const targetMember = useMemo(
    () => allMembers.find((m) => m.id === targetId),
    [allMembers, targetId]
  );

  // Swap source and target
  const handleSwapMembers = () => {
    if (sourceId && targetId) {
      const prevSource = sourceId;
      setSourceId(targetId);
      setTargetId(prevSource);
    }
  };

  // Add custom tag directly
  const handleAddCustomTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    const updated = addCustomRelationTag(trimmed);
    setCustomTags(updated);
    setLabel(trimmed);
    setNewTagInput('');
    setIsAddingCustomTag(false);
  };

  // Delete a custom tag
  const handleDeleteCustomTag = (tagToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeCustomRelationTag(tagToDelete);
    setCustomTags(updated);
    if (label === tagToDelete) {
      setLabel('');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId || !label.trim()) return;

    const trimmedLabel = label.trim();

    // Automatically persist custom tag if not existing
    if (
      !DEFAULT_RELATION_TAGS.includes(trimmedLabel) &&
      !customTags.includes(trimmedLabel)
    ) {
      addCustomRelationTag(trimmedLabel);
    }

    onSave({
      sourceId,
      targetId,
      label: trimmedLabel,
      category,
      strength,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const isEditing = Boolean(editingRelationship);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Link2 className={`w-4 h-4 ${isEditing ? 'text-amber-400' : 'text-sky-400'}`} />
            <h3 className="font-bold text-slate-100 text-sm">
              {isEditing ? '編輯人際關係連線' : '建立人際關係連線'}
            </h3>
            {isEditing && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-md">
                編輯中
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Member Connection Pair Selector */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                連線雙方成員
              </span>
              <button
                type="button"
                onClick={handleSwapMembers}
                title="對調起訖方向"
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400 hover:text-sky-300 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>對調方向</span>
              </button>
            </div>

            {/* Source Member */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                起點成員 (Source)
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs font-medium"
              >
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.id === targetId}>
                    {m.name} {m.group ? `(${m.group})` : ''} {m.isCenter ? '★ 核心自己' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Member Search & Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-slate-300">
                  目標成員 (Target) <span className="text-red-400">*</span>
                </label>
                {targetMember && (
                  <span className="text-[11px] text-sky-400 flex items-center gap-1 font-medium">
                    已選: {targetMember.name}
                  </span>
                )}
              </div>

              {/* Target Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="快速搜尋目標成員 (姓名、暱稱、分類、備註)..."
                  value={targetSearchQuery}
                  onChange={(e) => setTargetSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 text-xs"
                />
                {targetSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTargetSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Group Quick Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setTargetGroupFilter('all')}
                  className={`px-2 py-0.5 rounded text-[10px] shrink-0 transition ${
                    targetGroupFilter === 'all'
                      ? 'bg-slate-700 text-white font-medium'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  全部 ({allMembers.filter((m) => m.id !== sourceId).length})
                </button>
                {allGroups.map((g) => {
                  const count = allMembers.filter((m) => m.id !== sourceId && m.group === g).length;
                  return (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setTargetGroupFilter(g)}
                      className={`px-2 py-0.5 rounded text-[10px] shrink-0 transition ${
                        targetGroupFilter === g
                          ? 'bg-sky-600 text-white font-medium'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {g} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Target Member Candidates Pick-list */}
              <div className="max-h-36 overflow-y-auto space-y-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
                {filteredTargetCandidates.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 text-[11px]">
                    找不到符合條件的目標成員
                  </div>
                ) : (
                  filteredTargetCandidates.map((m) => {
                    const isSelected = m.id === targetId;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setTargetId(m.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
                          isSelected
                            ? 'bg-sky-600/25 border border-sky-500/50 text-white'
                            : 'hover:bg-slate-800/70 border border-transparent text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-sm"
                            style={{ backgroundColor: m.avatarColor || '#3b82f6' }}
                          >
                            {m.name.charAt(0)}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-xs text-slate-100">
                              {m.name}
                            </span>
                            {m.nickname && (
                              <span className="ml-1 text-[11px] text-slate-400">
                                ({m.nickname})
                              </span>
                            )}
                            <span className="ml-2 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                              {m.group}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Relationship Label & Custom Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-400" />
                <span>關係標籤</span>
                <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCustomTag(!isAddingCustomTag)}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium transition"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingCustomTag ? '收合自訂' : '新增自訂標籤'}</span>
              </button>
            </div>

            {/* Direct Input */}
            <input
              type="text"
              required
              placeholder="例如：共同創辦人、高中同窗、天使投資人、技術顧問"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 font-medium"
            />

            {/* Add Custom Tag Bar */}
            {isAddingCustomTag && (
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 animate-in fade-in duration-150">
                <div className="text-[11px] text-slate-300 font-medium">
                  自訂新的關係標籤 (儲存後永久保存在常用標籤選單中)：
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="輸入新關係標籤名稱..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 text-xs focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    disabled={!newTagInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium transition text-xs"
                  >
                    儲存標籤
                  </button>
                </div>
              </div>
            )}

            {/* Presets and Custom Chips */}
            <div>
              <div className="text-[10px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
                <span>點選快速套用關係標籤：</span>
                {customTags.length > 0 && (
                  <span className="text-amber-400/90 font-mono">
                    包含 {customTags.length} 個自訂標籤
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 rounded-xl bg-slate-950/40 border border-slate-800/70">
                {/* Custom Tags First */}
                {customTags.map((ct) => (
                  <span
                    key={`custom-${ct}`}
                    onClick={() => setLabel(ct)}
                    className={`group inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] cursor-pointer transition border ${
                      label === ct
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 font-semibold'
                        : 'bg-amber-950/20 text-amber-300/80 border-amber-800/40 hover:bg-amber-900/30'
                    }`}
                  >
                    <span>★ {ct}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCustomTag(ct, e)}
                      title="刪除此自訂標籤"
                      className="text-amber-400/60 hover:text-red-400 p-0.5 rounded transition"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}

                {/* Default Preset Tags */}
                {DEFAULT_RELATION_TAGS.map((ql) => (
                  <button
                    type="button"
                    key={`default-${ql}`}
                    onClick={() => setLabel(ql)}
                    className={`px-2 py-1 rounded-lg text-[11px] transition border ${
                      label === ql
                        ? 'bg-sky-600 text-white border-sky-500 font-semibold shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    {ql}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category & Strength */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">關係領域分類</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RelationCategory)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-300">緊密程度 (影響連線粗細與彈簧距離)</label>
                <span className="font-mono text-amber-400 font-bold">{strength} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="w-full accent-sky-500 mt-2"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">連線備忘說明 (選填)</label>
            <input
              type="text"
              placeholder="例如：2023 年在科技設計年會上經 Sam 牽線結識..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Confirmation Box for Deleting Relationship */}
          {isConfirmingDelete && editingRelationship && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2 animate-in fade-in duration-150">
              <div className="flex items-start gap-2 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  確定要切斷/刪除此關係連線「<strong className="text-white">{editingRelationship.label}</strong>」嗎？切斷後兩位成員之間的連線將立即移除。
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
                    if (onDeleteRelationship) {
                      onDeleteRelationship(editingRelationship.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-red-600/30 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>確認切斷關係</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Submit & Delete */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-800">
            {isEditing && onDeleteRelationship && editingRelationship ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isConfirmingDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-xl transition font-medium text-xs disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除此關係</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                className={`px-5 py-2 text-white rounded-xl font-medium transition shadow-lg ${
                  isEditing
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                    : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20'
                }`}
              >
                {isEditing ? '儲存修改' : '建立連線'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
